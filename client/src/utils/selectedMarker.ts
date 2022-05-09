import * as THREE from 'three';

export function getOuterEdgeMarkersGeometry(
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  edgeOffset: number,
  edgeLengthPercentage: number,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array([
    ...getOuterEdgeMarkerGeometry(v0, v1, v2, edgeOffset, edgeLengthPercentage),
    ...getOuterEdgeMarkerGeometry(v2, v0, v1, edgeOffset, edgeLengthPercentage),
    ...getOuterEdgeMarkerGeometry(v1, v2, v0, edgeOffset, edgeLengthPercentage)
  ]), 3)
  geometry.setAttribute('position', positions)
  return geometry
}

export function getInnerEdgeMarkersGeometry(
  v0: THREE.Vector3,
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  edgeOffset: number,
  edgeLengthPercentage: number,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array([
    ...getOuterEdgeMarkerGeometry(v0, v1, v2, -edgeOffset, edgeLengthPercentage),
    ...getOuterEdgeMarkerGeometry(v2, v0, v1, -edgeOffset, edgeLengthPercentage),
    ...getOuterEdgeMarkerGeometry(v1, v2, v0, -edgeOffset, edgeLengthPercentage)
  ]), 3)
  geometry.setAttribute('position', positions)
  return geometry
}

function getOuterEdgeMarkerGeometry(
  vA: THREE.Vector3,
  vB: THREE.Vector3,
  vC: THREE.Vector3,
  edgeOffset: number,
  edgeLengthPercentage: number,
): Float32Array {
  const vBA1 = getLengthPoint(vA, vB, edgeLengthPercentage)
  const vBA2 = getOffsetPoint(vB, vBA1, edgeOffset)
  const vBC1 = getLengthPoint(vC, vB, edgeLengthPercentage)
  const vBC2 = getOffsetPoint(vB, vBC1, -edgeOffset)
  const vE = getMiterPoint(vA, vB, vC, edgeOffset)

  // An edge marker geom is composed of 4 faces,
  // each with 3 positions,
  // each with 3 scalars
  if (edgeOffset > 0) {
    return new Float32Array([
      ...vB.toArray(), ...vBA1.toArray(), ...vBA2.toArray(),
      ...vBC2.toArray(), ...vBC1.toArray(), ...vB.toArray(),
      ...vB.toArray(), ...vBA2.toArray(), ...vE.toArray(),
      ...vB.toArray(), ...vE.toArray(), ...vBC2.toArray(),
    ])
  } else {
    return new Float32Array([
      ...vB.toArray(), ...vBA2.toArray(), ...vBA1.toArray(),
      ...vBC2.toArray(), ...vB.toArray(), ...vBC1.toArray(),
      ...vB.toArray(), ...vE.toArray(), ...vBA2.toArray(),
      ...vB.toArray(), ...vBC2.toArray(), ...vE.toArray(),
    ])
  }
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
  lengthPercentage: number
): THREE.Vector3 {
  const vBA = copy(vA).sub(vB)
  const u = vBA.multiplyScalar(lengthPercentage)
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
