import { decode, encode } from 'base64-arraybuffer';
import debounce from './debounce';

type UpdateListener = (position: number, colorId: number, time: number | null) => void;
type UpdateBulkListener = () => void;

// After initState() is called these values are practically no longer mutable,
// so it is okay in this case to disable the eslint rule.
// eslint-disable-next-line import/no-mutable-exports
export let stateColorIds: Uint8Array = new Uint8Array(0);
// eslint-disable-next-line import/no-mutable-exports
export let stateTimes: Float64Array = new Float64Array(0);
// eslint-disable-next-line import/no-mutable-exports
export let chunkTimes: Float64Array = new Float64Array(0);
let stateChunkSize = 0;
const updateListeners: UpdateListener[] = [];
const updateBulkListeners: UpdateBulkListener[] = [];
let debouncedPersist: () => {};
let loadedFromLocalStorage = false;

export const getTotalChunks = (): number => {
  if (stateColorIds.length === 0 || stateChunkSize === 0) {
    throw new Error('initState() must be called first.');
  }
  return Math.ceil(stateColorIds.length / stateChunkSize);
};

export function getStateColorId(position: number): number | null {
  if (stateColorIds.length === 0 || stateChunkSize === 0) {
    throw new Error('initState() must be called first.');
  }
  return stateColorIds[position];
}

export function persistToLocalStorage(): void {
  if (stateChunkSize === 0) {
    throw new Error('initState() must be called first.');
  }

  debouncedPersist();
}

export function hasLoadedFromLocalStorage(): boolean {
  return loadedFromLocalStorage;
}

export const initState = (size: number, chunkSize: number) => {
  stateChunkSize = chunkSize;
  stateColorIds = new Uint8Array(size);
  stateTimes = new Float64Array(size);
  chunkTimes = new Float64Array(getTotalChunks());
  debouncedPersist = debounce(() => {
    localStorage.setItem('stateColorIdsBase64', encode(stateColorIds.buffer));
    localStorage.setItem('chunkTimesBase64', encode(chunkTimes.buffer));
  }, 60000);
};

export function loadFromLocalStorage(): void {
  if (stateChunkSize === 0) {
    throw new Error('initState() must be called first.');
  }
  const stateColorIdsBase64 = localStorage.getItem('stateColorIdsBase64');
  const chunkTimesBase64 = localStorage.getItem('chunkTimesBase64');
  if (stateColorIdsBase64 === null || chunkTimesBase64 === null) {
    return;
  }
  const newStateColorIds = new Uint8Array(decode(stateColorIdsBase64));
  const newChunkTimes = new Float64Array(decode(chunkTimesBase64));
  if (
    newStateColorIds.length !== stateColorIds.length
    || newChunkTimes.length !== chunkTimes.length
  ) {
    return;
  }
  for (let chunkId = 0; chunkId < newChunkTimes.length; chunkId += 1) {
    const newTime = newChunkTimes[chunkId];
    chunkTimes[chunkId] = newTime;
    for (
      let position = chunkId * stateChunkSize;
      position < (chunkId + 1) * stateChunkSize;
      position += 1
    ) {
      stateColorIds[position] = newStateColorIds[position];
      stateTimes[position] = newTime;
    }
  }
  loadedFromLocalStorage = true;
}

export const update = (
  position: number,
  newColorId: number,
  newTime: number,
) => {
  if (stateTimes[position] > newTime) {
    return;
  }
  if (position < 0 || position >= stateColorIds.length) {
    return;
  }
  stateColorIds[position] = newColorId;
  if (newTime !== null) {
    stateTimes[position] = newTime;
  }
  updateListeners.forEach((listener) => {
    listener(position, newColorId, newTime);
  });
};

/**
 * This will trigger an update an update in the listeners, but the actual
 * state won't change. This is mainly used when we send an event to the
 * server, but we haven't yet acknowledged the response from the server.
 *
 * @param position
 * @param newColorId
 */
export const provisionalUpdate = (
  position: number,
  newColorId: number,
) => {
  if (position < 0 || position >= stateColorIds.length) {
    return;
  }
  updateListeners.forEach((listener) => {
    listener(position, newColorId, null);
  });
};

export const updateRange = (
  offset: number,
  newColorIds: Uint8Array,
  newTime: number,
) => {
  const offsetEnd = Math.min(offset + newColorIds.length, stateColorIds.length);
  for (let position = offset; position < offsetEnd; position += 1) {
    if (stateTimes[position] <= newTime) {
      stateColorIds[position] = newColorIds[position - offset];
      stateTimes[position] = newTime;
    }
  }
};

export const updateChunk = (
  chunkId: number,
  newColorIdsBase64: string,
  newTime: number,
) => {
  const newColorIds = new Uint8Array(decode(newColorIdsBase64));
  const offset = chunkId * stateChunkSize;
  updateRange(offset, newColorIds, newTime);
  chunkTimes[chunkId] = newTime;
};

export const triggerBulkUpdate = () => {
  updateBulkListeners.forEach((listener) => {
    listener();
  });
};

export const addUpdateListener = (listener: UpdateListener) => {
  updateListeners.push(listener);
};

export const addUpdateBulkListener = (listener: UpdateBulkListener) => {
  updateBulkListeners.push(listener);
};
