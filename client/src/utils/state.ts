type UpdateListener = (position: number, colorId: number, time: number|null) => void
type UpdateBulkListener = () => void

export let stateColorIds: Uint8Array = new Uint8Array(0)
export let stateTimes: Uint32Array = new Uint32Array(0)
let updateListeners: UpdateListener[] = []
let updateBulkListeners: UpdateBulkListener[] = []

export const initState = (size: number) => {
  stateColorIds = new Uint8Array(size)
  stateTimes = new Uint32Array(size)
}

export const update = (
  position: number,
  newColorId: number,
  newTime: number|null = null
) => {
  if (newTime !== null && stateTimes[position] > newTime) {
    return
  }
  stateColorIds[position] = newColorId
  if (newTime !== null) {
    stateTimes[position] = newTime
  }
  updateListeners.forEach((listener) => {
    listener(position, newColorId, newTime)
  })
}

export const updateBulk = (
  offset: number,
  newColorIds: Uint8Array,
  newTime: number
) => {
  for (let i=0; i <newColorIds.length; i++) {
    if (stateTimes[i + offset] > newTime) {
      return
    }
    stateColorIds[i + offset] = newColorIds[i]
    stateTimes[i + offset] = newTime
  }
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
