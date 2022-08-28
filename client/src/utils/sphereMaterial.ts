import * as THREE from 'three';
import { colorFloats } from './colors';

export default function getSphereShader(): THREE.ShaderMaterial {
  const vertexShaderColorIdMapping = colorFloats.map((colorFloatArr, index) => `
    case ${index}:
      vColor = vec4(
        ${colorFloatArr[0]},
        ${colorFloatArr[1]},
        ${colorFloatArr[2]},
        1
      );
      break;
`);

  const vertexShader = `
attribute int vertexColorId;
varying vec4 vColor;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  switch (vertexColorId) {
${vertexShaderColorIdMapping.join('')}
  }
}
`;

  const fragmentShader = `
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vColor;

void main() {
  gl_FragColor = vColor;
}
`;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: true,
  });
}
