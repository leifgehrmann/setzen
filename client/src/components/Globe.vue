<script setup lang="ts">
import * as THREE from 'three';
import {ArcballControls} from "three/examples/jsm/controls/ArcballControls";
import { colors } from "../utils/colors"
import { addUpdateListener, addUpdateBulkListener, stateColorIds } from "../utils/state"
import { onMounted } from 'vue'

let renderer: THREE.Renderer, scene: THREE.Scene, camera: THREE.Camera;
let sphere: THREE.Mesh;
let vertexColors: Int32Array;

addUpdateListener((position, colorId) => {
  let color = parseInt('0x' + colors[colorId].substring(1))
  vertexColors[position * 3] = color
  vertexColors[position * 3 + 1] = color
  vertexColors[position * 3 + 2] = color
  sphere.geometry.attributes.vertexColor.needsUpdate = true;
  renderer.render(scene, camera);
})

addUpdateBulkListener(() => {
  for (let i = 0; i < vertexColors.length; i+=3) {
    let color = parseInt('0x' + colors[stateColorIds[i/3]].substring(1))
    vertexColors[i] = color
    vertexColors[i+1] = color
    vertexColors[i+2] = color
  }
  sphere.geometry.attributes.vertexColor.needsUpdate = true;
  renderer.render(scene, camera);
})

const props = defineProps({
  sphereDetail: {
    type: Number,
    required: true
  },
  selectedPosition: {
    required: true
  }
});

const emit = defineEmits(['selectPosition'])

onMounted(() => {
  let controls: ArcballControls|null = null

  let cameraZoom = 390;
  let sphereDetail = props.sphereDetail;
  let sphereSize = 200;
  let minCameraDistance = sphereSize/2 + 5
  let maxCameraDistance = cameraZoom * 1.5
  if (window.innerWidth < window.innerHeight) {
    cameraZoom *= window.innerHeight/window.innerWidth
    maxCameraDistance = cameraZoom * 1.5
  }
  let cameraVector = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
  let cameraTrackballRadius = cameraZoom/cameraVector.distanceTo(new THREE.Vector3(0,0,0)) * cameraZoom

  const init = () => {

    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.x = cameraVector.x * cameraZoom
    camera.position.y = cameraVector.y * cameraZoom
    camera.position.z = cameraVector.z * cameraZoom

    var raycaster = new THREE.Raycaster();

    const rotateBtn = document.getElementById('rotate');
    rotateBtn?.addEventListener('mouse', () => {
      console.log('hey!')
      camera.rotation.z += Math.PI / 12;
    });

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const vertexShader = `
attribute int vertexColor;
varying vec4 vColor;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  vColor = vec4(
    float((vertexColor>>16)&255)/255.0,
    float((vertexColor>>8)&255)/255.0,
    float(vertexColor&255)/255.0,
    1
  );
}
`

    const fragmentShader = `
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vColor;

void main() {
  gl_FragColor = vColor;
}
`

    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false
    });


    const radius = sphereSize/2;

    const geometry = new THREE.IcosahedronGeometry(radius, sphereDetail);

    console.log(geometry.attributes.position.count/3)
    vertexColors = new Int32Array(geometry.attributes.position.count);

    geometry.setAttribute('vertexColor', new THREE.BufferAttribute(vertexColors, 1));

    sphere = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(sphere);

    const triangleClick = (event: MouseEvent) => {
      console.log("Click.");
      const mouseX = ( event.clientX / window.innerWidth ) * 2 - 1;
      const mouseY = - ( event.clientY / window.innerHeight ) * 2 + 1;
      const mouse = new THREE.Vector2( mouseX, mouseY);

      raycaster.setFromCamera( mouse, camera );
      const intersects = raycaster.intersectObjects( [sphere], true );

      // if there is one (or more) intersections
      if ( intersects.length > 0 ) {
        const face = intersects[ 0 ].face as THREE.Face;
        emit('selectPosition', Math.round(face.a / 3))
      }
    }

    renderer = new THREE.WebGLRenderer();
    // @ts-ignore
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const container = document.getElementById('container');
    container?.appendChild(renderer.domElement);

    //
    createControls(camera)
    window.addEventListener('resize', onWindowResize);

    container?.addEventListener( 'click', triangleClick, false );

    renderer.render(scene, camera);
  }

  function createControls( camera: THREE.Camera ) {

    controls = new ArcballControls( camera, renderer.domElement );

    controls.enablePan = false
    controls.minDistance = minCameraDistance
    controls.maxDistance = maxCameraDistance

    controls.addEventListener( 'change', function () {
      const newCameraTrackballRadius = cameraZoom/camera.position.distanceTo(new THREE.Vector3(0,0,0))
      if (newCameraTrackballRadius !== cameraTrackballRadius) {
        cameraTrackballRadius = newCameraTrackballRadius
        controls?.setTbRadius(newCameraTrackballRadius)
      }

      renderer.render( scene, camera );
    });

  }

  function onWindowResize() {
    // @ts-ignore
    camera.aspect = window.innerWidth / window.innerHeight;
    // @ts-ignore
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
  }

  init();
})
</script>

<template>
  <div id="container" class="cursor-pointer"></div>
</template>
