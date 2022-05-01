const AWS = require('aws-sdk');
const crypto = require('crypto');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

const {
  CONNECTIONS_TABLE_NAME,
  UPDATES_TABLE_NAME,
  CHUNKS_TABLE_NAME,
  CHUNK_INFO_TABLE_NAME,
  CHUNK_LOCKS_TABLE_NAME,
  QUEUE_TABLE_NAME
} = process.env;

const TOTAL_POSITIONS = 1012500;
const TOTAL_COLOR_IDS = 32;
// Chunk size was deliberately chosen to be within
// the websocket frame size limit of 32KB.
// Base64 encoding 16875 bytes results in 22443 Bytes.
const CHUNK_SIZE = 16875; // 1012500 / 20 / 3
const CHUNK_LOCK_EXPIRATION = 60 * 1000; // 60 seconds
const UPDATE_CHUNK_QUEUE_SIZE_THRESHOLD = 3;

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
    await ddb.put(putParams).promise();
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
    await ddb.put(updateParams).promise();
  } catch (err) {
    return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
  }
}

/**
 * @returns {Promise}
 */
const updateChunk = async () => {
  // Grab all items in the QueueTable.
  let queueData = await ddb.scan({
    TableName: QUEUE_TABLE_NAME,
    // Due to a limitation of DynamoDB, the reserved words 'position'
    // and 'time' need to be expressed as ExpressionAttributeNames.
    ProjectionExpression: '#p, colorId, #t',
    ExpressionAttributeNames: {
      '#p': 'position',
      '#t': 'time',
    }
  }).promise();

  // Only start processing queue if there are more than a few elements.
  // This is to minimise write requests to the database.
  if (queueData.Count < UPDATE_CHUNK_QUEUE_SIZE_THRESHOLD) {
    return
  }

  // Get the ChunkId for any random item and query the ChunkLocks Table for the chunkId.
  // If the ChunkLock is locked, and the locked timestamp was within 1 minute, exit.
  const queueItemIndex = Math.floor(queueData.Count * Math.random())
  const chunkId = getChunkIdForPosition(queueData.Items[queueItemIndex].position)
  const lockedAtExpires = Date.now() - CHUNK_LOCK_EXPIRATION
  try {
    await ddb.put({
      TableName: CHUNK_LOCKS_TABLE_NAME,
      Item: {
        chunkId: chunkId,
        lockedAt: Date.now()
      },
      ConditionExpression: `attribute_not_exists(chunkId) OR lockedAt < :locked_at_expires`,
      ExpressionAttributeValues: {
        ':locked_at_expires': lockedAtExpires
      }
    }).promise();
  } catch (err) {
    return
  }

  // Query the Chunks table for the ChunkId.
  const chunkData = await ddb.get({
    TableName: CHUNKS_TABLE_NAME,
    Key: {chunkId: chunkId}
  }).promise();
  if (chunkData.Item === undefined) {
    // Reset the chunkLock if there is no chunk.
    await ddb.delete({
      TableName: CHUNK_LOCKS_TABLE_NAME,
      Key: { chunkId: chunkId }
    }).promise();
    return
  }

  const uint8Array = new Uint8Array(Buffer.from(chunkData.Item.colorIds, 'base64'));
  const oldLastUpdatedAt = chunkData.Item.lastUpdatedAt
  let newLastUpdatedAt = oldLastUpdatedAt

  // For every queued item with same chunkId, update the chunk data
  const queueKeysToDelete = []
  queueData.Items.forEach((item) => {
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
    await ddb.batchWrite({
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
    }).promise()
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
      await ddb.batchWrite({
        RequestItems: {
          [QUEUE_TABLE_NAME]: queueDeleteRequests
        }
      }).promise()
    }
  } catch (err) {
    console.error('Failed to delete queue items. ' + err.message)
    return
  }

  // Delete the chunkLock.
  await ddb.delete({
    TableName: CHUNK_LOCKS_TABLE_NAME,
    Key: { chunkId: chunkId }
  }).promise();
}

/**
 *
 * @param {AWS.ApiGatewayManagementApi} apigwManagementApi
 * @param {{position: number, colorId: number, time: number}} updateData
 * @returns {Promise<unknown>}
 */
const broadcastUpdateEvent = async (
  apigwManagementApi,
  updateData
) => {
  let connectionData;

  connectionData = await ddb.scan({ TableName: CONNECTIONS_TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();

  return Promise.allSettled(connectionData.Items.map(async ({ connectionId }) => {
    try {
      const data = JSON.stringify({
        type: 'update',
        data: updateData
      })
      await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: data }).promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb.delete({ TableName: CONNECTIONS_TABLE_NAME, Key: { connectionId } }).promise();
      } else {
        throw e;
      }
    }
  }));
}

/**
 * @param {AWS.ApiGatewayManagementApi} apigwManagementApi
 * @param {string} connectionId
 * @param {{chunkId: number, colorIds: string, lastUpdatedAt: number}} chunkData
 * @returns {Promise<void>}
 */
const narrowcastChunkData = async (
  apigwManagementApi,
  connectionId,
  chunkData
) => {
  const data = JSON.stringify({
    type: 'chunk',
    data: chunkData
  })
  await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: data }).promise();
}

/**
 * @param {AWS.ApiGatewayManagementApi} apigwManagementApi
 * @param {string} connectionId
 * @param {{chunkId: number, lastUpdatedAt: number}[]} chunkInfoData
 * @returns {Promise<void>}
 */
const narrowcastChunkInfoData = async (
  apigwManagementApi,
  connectionId,
  chunkInfoData
) => {
  const data = JSON.stringify({
    type: 'chunkInfo',
    data: chunkInfoData
  })
  await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: data }).promise();
}

/**
 * @param {AWS.ApiGatewayManagementApi} apigwManagementApi
 * @param {string} connectionId
 * @param {{positions: number[], colorIds: number[], times: number[]}} queueData
 * @returns {Promise<void>}
 */
const narrowcastQueueData = async (
  apigwManagementApi,
  connectionId,
  queueData
) => {
  const data = JSON.stringify({
    type: 'queue',
    data: queueData
  })
  await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: data }).promise();
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

exports.handler = async event => {
  const connectionId = event.requestContext.connectionId
  const domainName = event.requestContext.domainName
  const stage = event.requestContext.stage
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: domainName + '/' + stage
  });

  const postData = JSON.parse(event.body).data;

  switch (postData.type) {
    case 'readChunk':
      if (!validChunkId(postData.chunkId)) {
        return { statusCode: 400, body: 'Invalid chunkId.' };
      }
      try {
        const chunkData = await ddb.get({
          TableName: CHUNKS_TABLE_NAME,
          Key: { chunkId: postData.chunkId }
        }).promise();
        let chunkItem = chunkData.Item
        // If a Chunk does not exist, we will populate the table
        // with a bunch of fake values.
        if (chunkItem === undefined) {
          const colorIds = new Uint8Array(CHUNK_SIZE)
          for (let i = 0; i<CHUNK_SIZE; i++) {
            colorIds[i] = Math.floor(Math.random() * TOTAL_COLOR_IDS)
          }
          const colorIdsBase64 = Buffer.from(colorIds.buffer).toString('base64')
          chunkItem = {
            chunkId: postData.chunkId,
            colorIds: colorIdsBase64,
            lastUpdatedAt: Date.now()
          }
          await ddb.put({
            TableName: CHUNKS_TABLE_NAME,
            Item: chunkItem
          }).promise();
        }
        await narrowcastChunkData(
          apigwManagementApi,
          connectionId,
          chunkItem
        );
      } catch (e) {
        return { statusCode: 500, body: e.stack };
      }
      return { statusCode: 200, body: 'Data sent.' };
    case 'readChunkInfo':
      try {
        let chunkInfoData = await ddb.scan({
          TableName: CHUNK_INFO_TABLE_NAME,
          ProjectionExpression: 'chunkId, lastUpdatedAt'
        }).promise();
        await narrowcastChunkInfoData(
          apigwManagementApi,
          connectionId,
          chunkInfoData.Count !== 0 ? chunkInfoData.Items : []
        );
      } catch (e) {
        console.error('Failed to scan chunk info. ', e.message)
        return { statusCode: 500, body: e.stack };
      }
      return { statusCode: 200, body: 'Data sent.' };
    case 'readQueue':
      try {
        // In theory, only 1MB of results will be returned by a single
        // scan. This is okay as we are hoping the queue won't build up
        // too much.
        let queueData = await ddb.scan({
          TableName: QUEUE_TABLE_NAME,
          ProjectionExpression: '#p, colorId, #t',
          ExpressionAttributeNames: {
            '#p': 'position',
            '#t': 'time',
          }
        }).promise();
        if (queueData.Count !== 0) {
          await narrowcastQueueData(
            apigwManagementApi,
            connectionId,
            {
              positions: queueData.Items.map((item) => item.position),
              colorIds: queueData.Items.map((item) => item.colorId),
              times: queueData.Items.map((item) => item.time)
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
      promises.push(broadcastUpdateEvent(apigwManagementApi, updateData))
      const updateChunkPromise = updateChunk()
      promises.push(updateChunkPromise)
      await Promise.allSettled(promises);
      return { statusCode: 200, body: 'Data sent.' };
    default:
      return { statusCode: 400, body: 'Invalid type.' };
  }
};
