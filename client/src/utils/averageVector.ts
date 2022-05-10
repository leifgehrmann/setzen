import * as THREE from 'three';

export function averageVector3(...vectors: THREE.Vector3[]) {
  let avgX = 0, avgY = 0, avgZ = 0
  vectors.forEach((v) => {
    avgX += v.x
    avgY += v.y
    avgZ += v.z
  })
  avgX /= vectors.length
  avgY /= vectors.length
  avgZ /= vectors.length
  return new THREE.Vector3(avgX, avgY, avgZ)
}
