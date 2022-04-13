<script lang="ts">
import * as THREE from 'three';
import {ArcballControls} from "three/examples/jsm/controls/ArcballControls";

var seed = 1;
function myRandom() {
  var x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export default {
  mounted() {

    let renderer: THREE.Renderer, scene: THREE.Scene, camera: THREE.Camera;

    let controls: ArcballControls|null = null

    let cameraZoom = 390;
    let cameraVector = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();

    let sphere: THREE.Sphere;

    let colorR: Float32Array;
    let colorG: Float32Array;
    let colorB: Float32Array;

    init();
    animate();

    function init() {

      if (window.innerWidth < window.innerHeight) {
        cameraZoom *= window.innerHeight/window.innerWidth
      }

      camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000);
      camera.position.x = cameraVector.x * cameraZoom
      camera.position.y = cameraVector.y * cameraZoom
      camera.position.z = cameraVector.z * cameraZoom

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050505);

      const vertexShader = `
  attribute float colorR;
  attribute float colorG;
  attribute float colorB;
  varying vec4 vColor;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vColor = vec4(colorR, colorG, colorB, 0.2);
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
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        vertexColors: true,
        flatShading: true
      });


      const radius = 100;

      const geometry = new THREE.IcosahedronGeometry(radius, 100);

      console.log(geometry.attributes.position.count)
      colorR = new Float32Array(geometry.attributes.position.count);
      colorG = new Float32Array(geometry.attributes.position.count);
      colorB = new Float32Array(geometry.attributes.position.count);

      for (let i = 0; i < colorR.length; i+=3) {
        colorR[i] = myRandom();
        colorG[i] = myRandom();
        colorB[i] = myRandom();
        colorR[i + 1] = colorR[i];
        colorG[i + 1] = colorG[i];
        colorB[i + 1] = colorB[i];
        colorR[i + 2] = colorR[i];
        colorG[i + 2] = colorG[i];
        colorB[i + 2] = colorB[i];
      }

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
      createControls(camera)
      window.addEventListener('resize', onWindowResize);

    }

    function createControls( camera: THREE.Camera ) {

      controls = new ArcballControls( camera, renderer.domElement );

      controls.enablePan = false

      controls.addEventListener( 'change', function () { renderer.render( scene, camera ); } );

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
      if (controls !== null) {
        const tbRadius = cameraZoom/camera.position.distanceTo(new THREE.Vector3(0,0,0))
        controls?.setTbRadius(tbRadius)
      }

      // camera.position.z = 0.001 * time;
      // rotateAroundWorldAxis(camera, new THREE.Vector3(1, 0, 0), 0.001)
      // camera.lookAt(new THREE.Vector3(0, 0, 0))

      // for (let i = 0; i < displacement.length; i+=3) {
      //   colorR[i] = colorR[i] * (1.05 - Math.random() * 0.1) + Math.random() * 0.001;
      //   colorG[i] = colorG[i] * (1.05 - Math.random() * 0.1) + Math.random() * 0.001;
      //   colorB[i] = colorB[i] * (1.05 - Math.random() * 0.1) + Math.random() * 0.001;
      //   colorR[i + 1] = colorR[i];
      //   colorG[i + 1] = colorG[i];
      //   colorB[i + 1] = colorB[i];
      //   colorR[i + 2] = colorR[i];
      //   colorG[i + 2] = colorG[i];
      //   colorB[i + 2] = colorB[i];
      // }

      // sphere.geometry.attributes.colorR.needsUpdate = true;
      // sphere.geometry.attributes.colorG.needsUpdate = true;
      // sphere.geometry.attributes.colorB.needsUpdate = true;

      renderer.render(scene, camera);

    }
  }
}
</script>

<template>
  <div id="container"></div>
</template>
