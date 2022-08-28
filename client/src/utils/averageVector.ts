import * as THREE from 'three';

export function averageVector2(...vectors: THREE.Vector2[]) {
  let avgX = 0;
  let avgY = 0;
  vectors.forEach((v) => {
    avgX += v.x;
    avgY += v.y;
  });
  avgX /= vectors.length;
  avgY /= vectors.length;
  return new THREE.Vector2(avgX, avgY);
}

export function averageVector3(...vectors: THREE.Vector3[]) {
  let avgX = 0;
  let avgY = 0;
  let avgZ = 0;
  vectors.forEach((v) => {
    avgX += v.x;
    avgY += v.y;
    avgZ += v.z;
  });
  avgX /= vectors.length;
  avgY /= vectors.length;
  avgZ /= vectors.length;
  return new THREE.Vector3(avgX, avgY, avgZ);
}
