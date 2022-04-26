import {chunkTimes, getTotalChunks, triggerBulkUpdate, update, updateChunk} from "./state";

let webSocket: WebSocket|null
let syncAttempts = 0
let syncing = false
let chunkLoadingId: number = 0
let chunkLoadingCallback: (value: void | PromiseLike<void>) => void = () => {}
let chunkLoadingTimeout = 5000
let chunkLoadingMaxAttempts = 5
let chunkInfoLoadingCallback: (value: {chunkId: number, lastUpdatedAt: number}[]) => void = () => {}
let chunkInfoLoadingTimeout = 5000
let chunkInfoLoadingMaxAttempts = 5


export function initWebSocket(
  openCallback: Function,
  closeCallback: Function
) {
  // `webSocketHost` is defined by vite.config.ts.
  // @ts-ignore
  webSocket = new WebSocket(webSocketHost)

  webSocket.addEventListener('open', () => {
    openCallback()
  })

  webSocket.addEventListener('close', () => {
    closeCallback()
  })

  webSocket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    switch(message.type) {
      case 'chunk':
        const chunkId = message.data.chunkId
        if (chunkLoadingId === chunkId) {
          chunkLoadingCallback()
          chunkLoadingCallback = () => {}
        }
        const lastUpdatedAt = message.data.lastUpdatedAt
        const colorIdsBase64 = message.data.colorIds
        updateChunk(chunkId, colorIdsBase64, lastUpdatedAt)
        break
      case 'chunkInfo':
        chunkInfoLoadingCallback(message.data)
        chunkLoadingCallback = () => {}
        break
      case 'queue':
        const {positions, colorIds, times} = message.data
        for (let i=0; i<positions.length; i++) {
          update(positions[i], colorIds[i], times[i])
        }
        break
      case 'update':
        update(message.data.position, message.data.colorId, message.data.time)
        break
    }
  })
}

export async function synchronise(
  percentageLoadedCallback: (percentageLoaded: number) => void
): Promise<void> {
  if (webSocket === null) {
    console.error('Attempted to synchronise with null websocket.')
    return
  }

  // Prevent multiple synchronisations from happening.
  if (syncing) {
    return
  }
  syncing = true

  try {
    // We'll calculate the loading percentage by predicting
    // how many items there will be:
    let totalChunks = getTotalChunks()
    let itemsToLoad = 1 + totalChunks

    // First, retrieve all items in the queue.
    await requestQueueData(webSocket)
    percentageLoadedCallback(1/itemsToLoad * 100)

    if (syncAttempts === 0) {
      // This means it is the first time we are loading chunks, so
      // we shall fetch all chunks.
      for (let chunkId = 0; chunkId < totalChunks; chunkId++) {
        await requestChunkData(webSocket, chunkId)
        percentageLoadedCallback((2 + chunkId)/itemsToLoad * 100)
      }
    } else {
      // This means it's not the first time, so we will only fetch chunks
      // that have actually been updated. So first we need to get a list of chunkIds
      // that we want to update for.

      const chunkInfo = (await requestChunkInfo(webSocket))
        // Filter out chunks that are not valid
        .filter(({ chunkId }) => chunkId >= 0 && chunkId < getTotalChunks())
        // ...and that do not need to be updated.
        .filter(({ chunkId, lastUpdatedAt }) => chunkTimes[chunkId] < lastUpdatedAt)

      // Now with a more accurate list, we will update the chunks.
      itemsToLoad = 1 + chunkInfo.length
      for (let i = 0; i < chunkInfo.length; i++) {
        await requestChunkData(webSocket, chunkInfo[i].chunkId)
        percentageLoadedCallback((2 + i)/itemsToLoad * 100)
      }
    }

    triggerBulkUpdate()
  } catch (err) {
    console.error(err)
  } finally {
    syncing = false
    syncAttempts++
  }
}

export async function requestUpdate(position: number, colorId: number): Promise<void> {
  if (webSocket === null) {
    console.error('Attempted to requestUpdate with null websocket.')
    return
  }
  webSocket.send(JSON.stringify({"action":"sendmessage", "data": {"type": "update", position, colorId}}))
}

async function requestQueueData(webSocket: WebSocket): Promise<void> {
  webSocket.send(JSON.stringify({"action":"sendmessage", "data": {"type": "readQueue"}}))
}

async function requestChunkData(webSocket: WebSocket, chunkId: number): Promise<void> {
  for (let attempt = 0; attempt < chunkLoadingMaxAttempts; attempt++) {
    try {
      await (new Promise((resolve, reject) => {
        chunkLoadingCallback = resolve
        chunkLoadingId = chunkId
        webSocket.send(JSON.stringify({"action": "sendmessage", "data": {"type": "readChunk", "chunkId": chunkId}}))
        setTimeout(() => {
          reject(new Error('Timed out requesting for chunk data.'))
        }, chunkLoadingTimeout)
      }))
      return
    } catch (err) {
      console.warn(err)
      console.warn(`Failed to request chunk data for chunkId ${chunkId}. Retrying...`)
    }
  }
  throw new Error('Failed to request chunk data.')
}

async function requestChunkInfo(
  webSocket: WebSocket
): Promise<{chunkId: number, lastUpdatedAt: number}[]> {
  for (let attempt = 0; attempt < chunkInfoLoadingMaxAttempts; attempt++) {
    try {
      return await (new Promise((resolve, reject) => {
        chunkInfoLoadingCallback = resolve
        webSocket.send(JSON.stringify({"action": "sendmessage", "data": {"type": "readChunkInfo"}}))
        setTimeout(() => {
          reject(new Error('Timed out requesting for chunk info data.'))
        }, chunkInfoLoadingTimeout)
      }))
    } catch (err) {
      console.warn(err)
      console.warn(`Failed to request chunk info data. Retrying...`)
    }
  }
  throw new Error('Failed to request chunk info.')
}
