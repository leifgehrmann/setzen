const AWS = require('aws-sdk');
const crypto = require('crypto');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

const {
  CONNECTIONS_TABLE_NAME,
  UPDATES_TABLE_NAME,
  CHUNKS_TABLE_NAME,
  CHUNK_LOCKS_TABLE_NAME,
  QUEUE_TABLE_NAME
} = process.env;

const TOTAL_POSITIONS = 1012500;
const TOTAL_COLOR_IDS = 31;
// Chunk size was deliberately chosen to be within
// the websocket frame size limit of 32KB.
// Base64 encoding 16875 bytes results in 22443 Bytes.
const CHUNK_SIZE = 16875; // 1012500 / 20 / 3

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
 *
 * @param {AWS.ApiGatewayManagementApi} apigwManagementApi
 * @param {{position: number, colorId: number, time: number}} updateData
 * @returns {Promise<unknown>[]}
 */
const broadcastUpdateEvent = async (
  apigwManagementApi,
  updateData
) => {
  let connectionData;

  connectionData = await ddb.scan({ TableName: CONNECTIONS_TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();

  return connectionData.Items.map(async ({ connectionId }) => {
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
  });
}

/**
 * @param {AWS.ApiGatewayManagementApi} apigwManagementApi
 * @param {string} connectionId
 * @param {unknown} chunkData
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
 * @param {unknown} queueData
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
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });

  const postData = JSON.parse(event.body).data;

  switch (postData.type) {
    case 'readChunk':
      if (!validChunkId(postData.chunkId)) {
        return { statusCode: 400, body: 'Invalid chunkId.' };
      }
      // Todo: Read the chunk from DynamoDB
      const chunkData = { chunkId: 0, colorIdsBase64: 'SGVsbG8gV29ybGQ=' }
      try {
        await narrowcastChunkData(apigwManagementApi, event.requestContext.connectionId, chunkData);
      } catch (e) {
        return { statusCode: 500, body: e.stack };
      }
      return { statusCode: 200, body: 'Data sent.' };
    case 'readQueue':
      // Todo: Read the queue from DynamoDB
      const queueData = [{
        position: 1,
        colorId: 1,
        time: 1
      }]
      try {
        await narrowcastQueueData(apigwManagementApi, event.requestContext.connectionId, queueData);
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
        event.requestContext.connectionId,
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
      const updateChunkPromise = Promise.resolve() // Todo
      promises.push(updateChunkPromise)
      try {
        await Promise.all(promises);
      } catch (e) {
        return { statusCode: 200, body: 'Data sent, but encountered an error: ' + e.stack };
      }
      return { statusCode: 200, body: 'Data sent.' };
    default:
      return { statusCode: 400, body: 'Invalid type.' };
  }
};
