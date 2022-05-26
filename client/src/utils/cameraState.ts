import {Camera, Vector3} from "three";
import {debounce} from "./debounce";

const debouncedSetCameraState = debounce((camera: Camera) => {
  localStorage.setItem('cameraStatePosition', JSON.stringify(camera.position.toArray()));
  localStorage.setItem('cameraStateUp', JSON.stringify(camera.up.toArray()));
}, 2000);

export function saveCameraState (camera: Camera) {
  debouncedSetCameraState(camera)
}

function getVectorFromLocalStorage (key: string): Vector3|null {
  const valueJson = localStorage.getItem(key)
  if (valueJson === null) {
    return null;
  }
  try {
    const valueArray = JSON.parse(valueJson);
    if (!Array.isArray(valueArray)) {
      return null;
    }
    if (valueArray.length !== 3) {
      return null;
    }
    return new Vector3().fromArray(valueArray)
  } catch (e) {
    return null;
  }

}

export function getSavedCameraState (): {position: Vector3, up: Vector3}|null {
  const position = getVectorFromLocalStorage('cameraStatePosition')
  const up = getVectorFromLocalStorage('cameraStateUp')
  if (position === null || up === null) {
    return null
  }
  return { position, up }
}
