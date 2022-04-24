import {Ref, ref} from "vue";
import {update, updateChunk} from "./state";

let webSocket: WebSocket|null
let chunkLoadingId: number = 0
let chunkLoadingCallback: (value: void | PromiseLike<void>) => void = () => {}
let chunkLoadingTimeout = 5000
let chunkLoadingMaxAttempts = 5

let connected = ref(false)

export function initWebSocket(openCallback: Function): Ref<boolean> {
  // `webSocketHost` is defined by vite.config.ts.
  // @ts-ignore
  webSocket = new WebSocket(webSocketHost)
  webSocket.addEventListener('open', () => {
    connected.value = true
    openCallback()
  })
  webSocket.addEventListener('close', () => {
    connected.value = false
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
      case 'queue':
        const {positions, colorIds, times} = message.data
        for (let i=0; i<positions.length; i++) {
          update(positions[i], colorIds[i], times[i])
        }
        break
      case 'update':
        update(message.position, message.colorId, message.time)
        break
    }
  })
  return connected
}

export async function synchronise(totalChunks: number): Promise<void> {
  if (webSocket === null) {
    console.error('Attempted to synchronise with null websocket.')
    return
  }
  // First, retrieve all items in the queue.
  await requestQueueData(webSocket)

  // Attempt to retrieve all chunks
  for (let chunkId = 0; chunkId < totalChunks; chunkId++) {
    await requestChunkData(webSocket, chunkId)
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
        webSocket.send(JSON.stringify({"action": "sendmessage", "data": {"type": "readChunk", "chunkId": chunkId}}))
        setTimeout(() => {
          reject()
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
