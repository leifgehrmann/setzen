import {getInnerEdgeMarkersGeometry, getOuterEdgeMarkersGeometry} from "./selectedMarkerGeometry";
import * as THREE from "three";

export function createSelectedMarker(
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  v3: THREE.Vector3,
  sphereDetail: number
): THREE.Mesh[] {
  const edgeOffset = 10 / sphereDetail
  const edgeLengthPercentage = 1 / 3

  const outerMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, opacity: 0.6 } );
  const innerMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, transparent: true, opacity: 0.6 } );

  const outerGeom = getOuterEdgeMarkersGeometry(v1, v2, v3, edgeOffset, edgeLengthPercentage)
  const outerMesh = new THREE.Mesh(outerGeom, outerMaterial );
  outerMesh.scale.multiplyScalar(1.0001)

  const innerGeom = getInnerEdgeMarkersGeometry(v1, v2, v3, edgeOffset, edgeLengthPercentage)
  const innerMesh = new THREE.Mesh(innerGeom, innerMaterial );
  innerMesh.scale.multiplyScalar(1.0001)

  return [outerMesh, innerMesh]
}
