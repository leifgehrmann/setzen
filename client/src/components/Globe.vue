<script lang="ts">
import * as THREE from 'three';

export default {
  mounted() {

    let renderer: THREE.Renderer, scene: THREE.Scene, camera: THREE.Camera;

    let sphere: THREE.Sphere, uniforms: THREE.Uniform;

    let displacement: Float32Array, noise: Float32Array;
    let colorR: Float32Array;
    let colorG: Float32Array;
    let colorB: Float32Array;

    init();
    animate();

    function init() {

      camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000);
      camera.position.z = 300;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050505);

      uniforms = {

        'amplitude': {value: 1.0},
        'color': {value: new THREE.Color(0xff2200)},

      };

      const vertexShader = `
  attribute float colorR;
  attribute float colorG;
  attribute float colorB;
  varying vec4 vColor;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vColor = vec4(colorR, colorG, colorB, 1.0);
  }
  `

      const fragmentShader = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec4 vColor;

  uniform vec3 color;

  void main() {
    gl_FragColor = vColor;
  }
  `

      const shaderMaterial = new THREE.ShaderMaterial({

        uniforms: uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        vertexColors: true,
        flatShading: true
      });


      const radius = 50;

      const geometry = new THREE.IcosahedronGeometry(radius, 80);

      console.log(geometry.attributes.position.count)
      displacement = new Float32Array(geometry.attributes.position.count);
      colorR = new Float32Array(geometry.attributes.position.count);
      colorG = new Float32Array(geometry.attributes.position.count);
      colorB = new Float32Array(geometry.attributes.position.count);
      noise = new Float32Array(geometry.attributes.position.count);

      for (let i = 0; i < displacement.length; i++) {

        noise[i] = 0;

      }

      geometry.setAttribute('displacement', new THREE.BufferAttribute(displacement, 1));
      geometry.setAttribute('colorR', new THREE.BufferAttribute(colorR, 1));
      geometry.setAttribute('colorG', new THREE.BufferAttribute(colorG, 1));
      geometry.setAttribute('colorB', new THREE.BufferAttribute(colorB, 1));

      sphere = new THREE.Mesh(geometry, shaderMaterial);
      scene.add(sphere);

      renderer = new THREE.WebGLRenderer();
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);

      const container = document.getElementById('container');
      container?.appendChild(renderer.domElement);

      //

      window.addEventListener('resize', onWindowResize);

    }

    function onWindowResize() {

      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);

    }

    function animate() {

      requestAnimationFrame(animate);

      render();

    }

    function render() {

      const time = Date.now() * 0.01;

      sphere.rotation.y = sphere.rotation.z = 0.01 * time;

      uniforms['amplitude'].value = 1;
      uniforms['color'].value.offsetHSL(0.0005, 0, 0);

      for (let i = 0; i < displacement.length; i++) {

        displacement[i] = Math.sin(0.1 * i + time);

        noise[i] += 0.5 * (0.5 - Math.random());
        noise[i] = THREE.MathUtils.clamp(noise[i], -5, 5);

        displacement[i] += noise[i];

      }

      for (let i = 0; i < displacement.length; i+=3) {
        colorR[i] = colorR[i] * (1.05 - Math.random() * 0.1) + Math.random() * 0.001;
        colorG[i] = colorG[i] * (1.05 - Math.random() * 0.1) + Math.random() * 0.001;
        colorB[i] = colorB[i] * (1.05 - Math.random() * 0.1) + Math.random() * 0.001;
        colorR[i + 1] = colorR[i];
        colorG[i + 1] = colorG[i];
        colorB[i + 1] = colorB[i];
        colorR[i + 2] = colorR[i];
        colorG[i + 2] = colorG[i];
        colorB[i + 2] = colorB[i];
      }

      sphere.geometry.attributes.displacement.needsUpdate = true;
      sphere.geometry.attributes.colorR.needsUpdate = true;
      sphere.geometry.attributes.colorG.needsUpdate = true;
      sphere.geometry.attributes.colorB.needsUpdate = true;

      renderer.render(scene, camera);

    }
  }
}
</script>

<template>
  <div id="container"></div>
</template>
