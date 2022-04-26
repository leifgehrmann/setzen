type UpdateListener = (position: number, colorId: number, time: number|null) => void
type UpdateBulkListener = () => void

export let stateColorIds: Uint8Array = new Uint8Array(0)
export let stateTimes: Uint32Array = new Uint32Array(0)
export let chunkTimes: Uint32Array = new Uint32Array(0)
let stateChunkSize = 0
let updateListeners: UpdateListener[] = []
let updateBulkListeners: UpdateBulkListener[] = []

const getChunkIdForPosition = (position: number): number => {
  if (stateChunkSize === 0) {
    throw new Error('initState() must be called first.')
  }
  return Math.floor(position / stateChunkSize)
}

export const getTotalChunks = (): number => {
  if (stateColorIds.length === 0 || stateChunkSize === 0) {
    throw new Error('initState() must be called first.')
  }
  return Math.ceil(stateColorIds.length/stateChunkSize)
}

export const initState = (size: number, chunkSize: number) => {
  stateChunkSize = chunkSize
  stateColorIds = new Uint8Array(size)
  stateTimes = new Uint32Array(size)
  chunkTimes = new Uint32Array(getTotalChunks())
}

export const update = (
  position: number,
  newColorId: number,
  newTime: number|null = null
) => {
  if (newTime !== null && stateTimes[position] > newTime) {
    return
  }
  if (position < 0 || position >= stateColorIds.length) {
    return
  }
  stateColorIds[position] = newColorId
  if (newTime !== null) {
    stateTimes[position] = newTime
    chunkTimes[getChunkIdForPosition(position)] = newTime
  }
  updateListeners.forEach((listener) => {
    listener(position, newColorId, newTime)
  })
}

export const updateChunk = (
  chunkId: number,
  newColorIdsBase64: string,
  newTime: number
) => {
  const newColorIds = Uint8Array.from(atob(newColorIdsBase64), c => c.charCodeAt(0))
  const offset = chunkId * stateChunkSize
  updateRange(offset, newColorIds, newTime)
  chunkTimes[chunkId] = newTime
}

export const updateRange = (
  offset: number,
  newColorIds: Uint8Array,
  newTime: number
) => {
  const offsetEnd = Math.min(offset + newColorIds.length, stateColorIds.length)
  for (let position = offset; position < offsetEnd; position++) {
    if (stateTimes[position] > newTime) {
      return
    }
    stateColorIds[position] = newColorIds[position - offset]
    stateTimes[position] = newTime
  }
}

export const triggerBulkUpdate = () => {
  updateBulkListeners.forEach((listener) => {
    listener()
  })
}

export const addUpdateListener = (listener: UpdateListener) => {
  updateListeners.push(listener)
}

export const addUpdateBulkListener = (listener: UpdateBulkListener) => {
  updateBulkListeners.push(listener)
}
