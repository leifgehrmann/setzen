import * as THREE from 'three';

export function getOuterEdgeMarkersGeometry(
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3
): THREE.BufferGeometry[] {
  return [
    getOuterEdgeMarkerGeometry(v0, v1, v2),
    //getOuterEdgeMarkerGeometry(v1, v0, v2),
    //getOuterEdgeMarkerGeometry(v2, v0, v1)
  ]
}

function getOuterEdgeMarkerGeometry(
  vA: THREE.Vector3,
  vB: THREE.Vector3,
  vC: THREE.Vector3,
  edgeOffset = 1,
  edgeLength = 1,
  elevation = 1
): THREE.BufferGeometry {
  console.log('goemg', vA, vB, vC)
  const vBA1 = getLengthPoint(vA, vB, edgeLength)
  const vBA2 = getOffsetPoint(vB, vBA1, edgeOffset)
  const vBC1 = getLengthPoint(vC, vB, edgeLength)
  const vBC2 = getOffsetPoint(vB, vBC1, edgeOffset)
  const vE = getMiterPoint(vA, vB, vC, edgeOffset)

  console.log(vBA1)
  console.log(vBA2)
  console.log(vBC1)
  console.log(vBC2)
  console.log(vE)

  const geometry = new THREE.BufferGeometry();
  // An edge marker geom is composed of 4 faces,
  // each with 3 positions,
  // each with 3 scalars
  const positions = new THREE.BufferAttribute(new Float32Array([
    ...vB.toArray(), ...vBA1.toArray(), ...vBA2.toArray(),
    ...vB.toArray(), ...vBC1.toArray(), ...vBC2.toArray(),
    ...vB.toArray(), ...vE.toArray(), ...vBA2.toArray(),
    ...vB.toArray(), ...vE.toArray(), ...vBC2.toArray(),
  ]), 3)
  geometry.setAttribute('position', positions)
  return geometry
}

function getMiterPoint(
  vA: THREE.Vector3,
  vB: THREE.Vector3,
  vC: THREE.Vector3,
  offset: number
): THREE.Vector3 {
  // See https://math.stackexchange.com/questions/1849784/calculate-miter-points-of-stroked-vectors-in-cartesian-plane
  const vBA = copy(vA).sub(vB)
  const vBC = copy(vC).sub(vB)
  const beta = vBA.angleTo(vBC)
  // Not sure if it technically is called the hypotenuse...
  const hypotenuse = offset / Math.sin(beta)

  const u = vBA.multiplyScalar(hypotenuse / vB.distanceTo(vA))
  const v = vBC.multiplyScalar(hypotenuse / vB.distanceTo(vC))
  return copy(vB).sub(u).sub(v)
}

function getLengthPoint(
  vA: THREE.Vector3,
  vB: THREE.Vector3,
  length: number
): THREE.Vector3 {
  console.log('ubefore', vA, vB)
  const vBA = copy(vA).sub(vB)
  const u = copy(vBA).normalize().multiplyScalar(length)
  console.log('uAfter', vA, vB, length, vBA, u)
  return copy(vB).add(u)
}

function getOffsetPoint(
  vB: THREE.Vector3,
  vBA: THREE.Vector3,
  offset: number
): THREE.Vector3 {
  return copy(vBA).add(copy(vB).cross(vBA).normalize().multiplyScalar(offset))
}

function copy(v: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3().copy(v)
}
