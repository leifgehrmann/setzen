import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";
import { PostToConnectionCommand, ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";
import crypto from "crypto";

const ddbClient = new DynamoDBClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });
const agmClient = new ApiGatewayManagementApiClient({ region: process.env.AWS_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const {
  CONNECTIONS_TABLE_NAME,
  UPDATES_TABLE_NAME,
  CHUNKS_TABLE_NAME,
  CHUNK_INFO_TABLE_NAME,
  CHUNK_LOCKS_TABLE_NAME,
  QUEUE_TABLE_NAME
} = process.env;

const TOTAL_POSITIONS = 1012500;

// Total number of colours supported. The client side has a maximum of
// 8 bits (a byte), so the maximum total color IDs supported is 256.
const TOTAL_COLOR_IDS = 32;

// Chunk size was deliberately chosen to be within the websocket frame size
// limit of 32KB.
// Base64 encoding 16875 bytes results in 22443 bytes (22KB).
const CHUNK_SIZE = 16875; // 1012500 / 20 / 3

// How long a lock should be held when a chunk update occurs.
const CHUNK_LOCK_EXPIRATION = 60 * 1000; // 60 seconds

// The number of entries that should trigger a chunk update.
const UPDATE_CHUNK_QUEUE_SIZE_THRESHOLD = 20;

// Ideally the queue size should not be big. But if it is, we might run
// into an issue where the queued data cannot be sent to the client on
// page load. It is unclear if this will happen regularly, but we'll add
// this threshold to ring warning bells.
// Each queue item has a length of approximately 60 bytes. The websocket
// frame size cannot be over 32 KB, so approximately 500 items should
// trigger a warning. (60B * 500 ≅ 29KB)
const READ_QUEUE_ITEM_COUNT_THRESHOLD_WARNING = 500;

/**
 * @param {ScanCommandInput} params
 * @returns {Promise<*[]>}
 */
const scanAll = async (params) => {
  const items = [];
  while (true) {
    const result = await ddbDocClient.send(new ScanCommand(params))
    items.push(...result.Items);
    if (typeof result.LastEvaluatedKey === 'undefined') {
      break;
    }
    console.warn(
      `Multiple query scans were required to retrieve data. Table Name: '${params.TableName}', LastEvaluatedKey: '${data.LastEvaluatedKey}'`
    )
    params.ExclusiveStartKey = result.LastEvaluatedKey
  }
  return items
}

/**
 * @param {string} connectionId
 * @param {{position: number, colorId: number, time: number}} updateData
 * @returns {Promise<{body: string, statusCode: number}>}
 */
const addToUpdates = async (connectionId, updateData) => {
  const putParams = {
    TableName: UPDATES_TABLE_NAME,
    Item: {
      i: crypto.randomUUID(),
      a: connectionId,
      p: updateData.position,
      c: updateData.colorId,
      t: updateData.time
    }
  };

  try {
    await ddbDocClient.send(new PutCommand(putParams));
  } catch (err) {
    return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
  }
}

/**
 * @param {{position: number, colorId: number, time: number}} updateData
 * @returns {Promise<{body: string, statusCode: number}>}
 */
const addToQueue = async (updateData) => {
  const updateParams = {
    TableName: QUEUE_TABLE_NAME,
    Item: {
      position: updateData.position,
      colorId: updateData.colorId,
      time: updateData.time
    }
  };

  try {
    await ddbDocClient.send(new PutCommand(updateParams));
  } catch (err) {
    return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
  }
}

/**
 * @returns {Promise}
 */
const updateChunk = async () => {
  // Grab all items in the QueueTable.
  let queueData = await scanAll({
    TableName: QUEUE_TABLE_NAME,
    // Due to a limitation of DynamoDB, the reserved words 'position'
    // and 'time' need to be expressed as ExpressionAttributeNames.
    ProjectionExpression: '#p, colorId, #t',
    ExpressionAttributeNames: {
      '#p': 'position',
      '#t': 'time',
    }
  })

  // Only start processing queue if there are more than a few elements.
  // This is to minimise write requests to the database.
  if (queueData.length < UPDATE_CHUNK_QUEUE_SIZE_THRESHOLD) {
    return
  }

  // Get the ChunkId for any random item and query the ChunkLocks Table for the chunkId.
  // If the ChunkLock is locked, and the locked timestamp was within 1 minute, exit.
  const queueItemIndex = Math.floor(queueData.length * Math.random())
  const chunkId = getChunkIdForPosition(queueData[queueItemIndex].position)
  const lockedAtExpires = Date.now() - CHUNK_LOCK_EXPIRATION
  try {
    await ddbDocClient.send(new PutCommand({
      TableName: CHUNK_LOCKS_TABLE_NAME,
      Item: {
        chunkId: chunkId,
        lockedAt: Date.now()
      },
      ConditionExpression: `attribute_not_exists(chunkId) OR lockedAt < :locked_at_expires`,
      ExpressionAttributeValues: {
        ':locked_at_expires': lockedAtExpires
      }
    }));
  } catch (err) {
    return
  }

  // Query the Chunks table for the ChunkId.
  const chunkData = await ddbDocClient.send(new GetCommand({
    TableName: CHUNKS_TABLE_NAME,
    Key: {chunkId: chunkId}
  }));
  if (chunkData.Item === undefined) {
    // Reset the chunkLock if there is no chunk.
    await ddbDocClient.send(new DeleteCommand({
      TableName: CHUNK_LOCKS_TABLE_NAME,
      Key: { chunkId: chunkId }
    }));
    return
  }

  const uint8Array = new Uint8Array(Buffer.from(chunkData.Item.colorIds, 'base64'));
  const oldLastUpdatedAt = chunkData.Item.lastUpdatedAt
  let newLastUpdatedAt = oldLastUpdatedAt

  // For every queued item with same chunkId, update the chunk data
  const queueKeysToDelete = []
  queueData.forEach((item) => {
    const chunkIdForItem = getChunkIdForPosition(item.position)
    if (chunkIdForItem !== chunkId) {
      // Skip this item because it is not in the chunk.
      return
    }

    // Only update the color if the time is greater than the
    // chunk's last-update.
    const time = item.time
    if (time >= oldLastUpdatedAt) {
      const indexWithinChunk = getIndexWithinChunkForPosition(item.position)
      uint8Array[indexWithinChunk] = item.colorId
      newLastUpdatedAt = Math.max(newLastUpdatedAt, time)
    }

    queueKeysToDelete.push(item.position)
  })

  // Store the new chunk value.
  try {
    const colorIdsBase64 = Buffer.from(uint8Array.buffer).toString('base64')
    await ddbDocClient.send(new BatchWriteCommand({
      RequestItems: {
        [CHUNKS_TABLE_NAME]: [{
          PutRequest: {
            Item: {
              chunkId: chunkId,
              colorIds: colorIdsBase64,
              lastUpdatedAt: newLastUpdatedAt
            }
          }
        }],
        [CHUNK_INFO_TABLE_NAME]: [{
          PutRequest: {
            Item: {
              chunkId: chunkId,
              lastUpdatedAt: newLastUpdatedAt
            }
          }
        }]
      }
    }));
  } catch (err) {
    console.error('Failed to put chunk. ' + err.message)
    return
  }
  // Delete the queued items that were processed. batchWrite only supports
  // 25 requests at a time, so we need to send them in chunks of 25.
  try {
    for (let i=0; i<queueKeysToDelete.length; i+= 25) {
      const queueDeleteRequests = queueKeysToDelete.slice(i, 25).map((key) => {
        return {
          DeleteRequest: {
            Key: { position: key }
          }
        }
      })
      await ddbDocClient.send(new BatchWriteCommand({
        RequestItems: {
          [QUEUE_TABLE_NAME]: queueDeleteRequests
        }
      }));
    }
  } catch (err) {
    console.error('Failed to delete queue items. ' + err.message)
    return
  }

  // Delete the chunkLock.
  await ddbDocClient.send(new DeleteCommand({
    TableName: CHUNK_LOCKS_TABLE_NAME,
    Key: { chunkId: chunkId }
  }));
}

/**
 *
 * @param {ApiGatewayManagementApiClient} agmClient
 * @param {{position: number, colorId: number, time: number}} updateData
 * @returns {Promise<unknown>}
 */
const broadcastUpdateEvent = async (
  agmClient,
  updateData
) => {
  let connectionData;

  connectionData = await scanAll({
    TableName: CONNECTIONS_TABLE_NAME,
    ProjectionExpression: 'connectionId'
  });

  return Promise.allSettled(connectionData.map(async ({ connectionId }) => {
    try {
      const data = JSON.stringify({
        type: 'update',
        data: updateData
      })
      await agmClient.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: data }));
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddbDocClient.send(new DeleteCommand({ TableName: CONNECTIONS_TABLE_NAME, Key: { connectionId } }));
      } else {
        throw e;
      }
    }
  }));
}

/**
 * @param {ApiGatewayManagementApiClient} agmClient
 * @param {string} connectionId
 * @param {{chunkId: number, colorIds: string, lastUpdatedAt: number}} chunkData
 * @returns {Promise<void>}
 */
const narrowcastChunkData = async (
  agmClient,
  connectionId,
  chunkData
) => {
  const data = JSON.stringify({
    type: 'chunk',
    data: chunkData
  })
  await agmClient.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: data }));
}

/**
 * @param {ApiGatewayManagementApiClient} agmClient
 * @param {string} connectionId
 * @param {{chunkId: number, lastUpdatedAt: number}[]} chunkInfoData
 * @returns {Promise<void>}
 */
const narrowcastChunkInfoData = async (
  agmClient,
  connectionId,
  chunkInfoData
) => {
  const data = JSON.stringify({
    type: 'chunkInfo',
    data: chunkInfoData
  })
  await agmClient.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: data }));
}

/**
 * @param {ApiGatewayManagementApiClient} agmClient
 * @param {string} connectionId
 * @param {{positions: number[], colorIds: number[], times: number[]}} queueData
 * @returns {Promise<void>}
 */
const narrowcastQueueData = async (
  agmClient,
  connectionId,
  queueData
) => {
  const data = JSON.stringify({
    type: 'queue',
    data: queueData
  })
  await agmClient.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: data }));
}

/**
 * @param {number} position
 * @returns {number}
 */
const getChunkIdForPosition = (position) => {
  return Math.floor(position / CHUNK_SIZE)
}

/**
 * @param {number} position
 * @returns {number}
 */
const getIndexWithinChunkForPosition = (position) => {
  return position % CHUNK_SIZE
}

/**
 * @param {unknown} chunkId
 * @returns {boolean}
 */
const validChunkId = (chunkId) => {
  return typeof chunkId === 'number' &&
    chunkId >= 0 &&
    chunkId < TOTAL_POSITIONS / CHUNK_SIZE &&
    Number.isInteger(chunkId)
}

/**
 * @param {unknown} position
 * @returns {boolean}
 */
const validPosition = (position) => {
  return typeof position === 'number' &&
    position >= 0 &&
    position <= TOTAL_POSITIONS &&
    Number.isInteger(position)
}

/**
 * @param {unknown} colorId
 * @returns {boolean}
 */
const validColorId = (colorId) => {
  return typeof colorId === 'number' &&
    colorId >= 0 &&
    colorId < TOTAL_COLOR_IDS &&
    Number.isInteger(colorId)
}

function pseudorandomColorId (seed) {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * TOTAL_COLOR_IDS);
}

export const handler = async (event) => {
  const connectionId = event.requestContext.connectionId
  const domainName = event.requestContext.domainName
  const stage = event.requestContext.stage
  agmClient.config.endpoint = 'https://' + domainName + '/' + stage;

  const postData = JSON.parse(event.body).data;

  // Used for analytics.
  console.info(`Received request type: ${postData.type} using connection id: ${connectionId}.`)

  switch (postData.type) {
    case 'readChunk':
      if (!validChunkId(postData.chunkId)) {
        return { statusCode: 400, body: 'Invalid chunkId.' };
      }
      try {
        const chunkData = await ddbDocClient.send(new GetCommand({
          TableName: CHUNKS_TABLE_NAME,
          Key: { chunkId: postData.chunkId }
        }));
        let chunkItem = chunkData.Item
        // If a Chunk does not exist, we will populate the table
        // with a bunch of fake values.
        if (chunkItem === undefined) {
          const colorIds = new Uint8Array(CHUNK_SIZE)
          for (let i = 0; i<CHUNK_SIZE; i++) {
            colorIds[i] = pseudorandomColorId(postData.chunkId * CHUNK_SIZE + i)
          }
          const colorIdsBase64 = Buffer.from(colorIds.buffer).toString('base64')
          chunkItem = {
            chunkId: postData.chunkId,
            colorIds: colorIdsBase64,
            lastUpdatedAt: Date.now()
          }
          await ddbDocClient.send(new PutCommand({
            TableName: CHUNKS_TABLE_NAME,
            Item: chunkItem
          }));
          await ddbDocClient.send(new PutCommand({
            TableName: CHUNK_INFO_TABLE_NAME,
            Item: {
              chunkId: chunkItem.chunkId,
              lastUpdatedAt: chunkItem.lastUpdatedAt
            }
          }));
        }
        await narrowcastChunkData(
          agmClient,
          connectionId,
          chunkItem
        );
      } catch (e) {
        return { statusCode: 500, body: e.stack };
      }
      return { statusCode: 200, body: 'Data sent.' };
    case 'readChunkInfo':
      let chunkInfoData;
      try {
        chunkInfoData = await scanAll({
          TableName: CHUNK_INFO_TABLE_NAME,
          ProjectionExpression: 'chunkId, lastUpdatedAt'
        })
      } catch (e) {
        console.error('Failed to scan chunk info. ', e.message)
        return { statusCode: 500, body: e.stack };
      }
      try {
        await narrowcastChunkInfoData(
          agmClient,
          connectionId,
          chunkInfoData
        );
      } catch (e) {
        console.error('Failed to narrowcast chunk info. ', e.message)
        return { statusCode: 500, body: e.stack };
      }
      return { statusCode: 200, body: 'Data sent.' };
    case 'readQueue':
      try {
        // In theory, only 1MB of results will be returned by a single
        // scan. This is okay as we are hoping the queue won't build up
        // too much.
        let queueData = await scanAll({
          TableName: QUEUE_TABLE_NAME,
          ProjectionExpression: '#p, colorId, #t',
          ExpressionAttributeNames: {
            '#p': 'position',
            '#t': 'time',
          }
        });
        if (queueData.length > READ_QUEUE_ITEM_COUNT_THRESHOLD_WARNING) {
          // If this occurs, that means the client app might not be able to receieve the
          // websocket frames, since they exceed 32KB.
          console.warn(
            `Number of queued items reached dangerous limits. QueueData Length: ${queueData.length}`
          )
        }
        if (queueData.length !== 0) {
          await narrowcastQueueData(
            agmClient,
            connectionId,
            {
              positions: queueData.map((item) => item.position),
              colorIds: queueData.map((item) => item.colorId),
              times: queueData.map((item) => item.time)
            }
          );
        }
      } catch (e) {
        return { statusCode: 500, body: e.stack };
      }
      return { statusCode: 200, body: 'Data sent.' };
    case 'update':
      if (!validPosition(postData.position)) {
        return { statusCode: 400, body: 'Invalid position.' };
      }
      if (!validColorId(postData.colorId)) {
        return { statusCode: 400, body: 'Invalid colorId.' };
      }

      // Some IP addresses may need to be banned if they break the rules.
      // We log the IP address in case we need to resort to that.
      console.info(`Received update request from IP address: ${event.requestContext.identity.sourceIp} using connection id: ${connectionId}.`)

      const updateData = {
        position: postData.position,
        colorId: postData.colorId,
        time: Date.now()
      }

      const addToUpdatesPromise = addToUpdates(
        connectionId,
        updateData
      )
      const addToQueuePromise = addToQueue(
        updateData
      )

      try {
        await Promise.all([addToUpdatesPromise, addToQueuePromise]);
      } catch (e) {
        return { statusCode: 500, body: e.stack };
      }

      let promises = []
      promises.push(broadcastUpdateEvent(agmClient, updateData))
      const updateChunkPromise = updateChunk()
      promises.push(updateChunkPromise)
      await Promise.allSettled(promises);
      return { statusCode: 200, body: 'Data sent.' };
    default:
      return { statusCode: 400, body: 'Invalid type.' };
  }
};
