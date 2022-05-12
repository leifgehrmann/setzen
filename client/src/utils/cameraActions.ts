import * as THREE from "three";

export function rotateCameraAlongAxis (camera: THREE.Camera, axis: THREE.Vector3, angle: number): void {
  const quaternion = new THREE.Quaternion().setFromAxisAngle( axis, angle );
  camera.position.applyQuaternion( quaternion );
  camera.up.applyQuaternion( quaternion );
  camera.lookAt(new THREE.Vector3())
}

export function rotateCameraAlongEyeAxis (camera: THREE.Camera, angle: number): void {
  const quaternion = new THREE.Quaternion().setFromAxisAngle( camera.position.clone().normalize(), angle );
  camera.up.applyQuaternion(quaternion)
  camera.lookAt(new THREE.Vector3())
}

export function zoomCameraToDistance(camera: THREE.Camera, distance: number): void {
  const maxCameraPosition = camera.position.normalize().multiplyScalar(distance)
  camera.position.copy(maxCameraPosition)
}
