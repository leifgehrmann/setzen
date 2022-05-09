<script setup lang="ts">
import * as THREE from 'three';
import { colorFloats } from "../utils/colors"
import { addUpdateListener, addUpdateBulkListener, stateColorIds } from "../utils/state"
import { watch, onMounted } from 'vue'
import { getInnerEdgeMarkersGeometry, getOuterEdgeMarkersGeometry } from "../utils/selectedMarker";
import { clamp } from "three/src/math/MathUtils";

let renderer: THREE.Renderer
let scene: THREE.Scene
let camera: THREE.Camera
let raycaster: THREE.Raycaster
let sphere: THREE.Mesh;
let vertexColorIds: Int32Array; // WebGl doesn't allow 8-bit arrays as attributes.
let cameraZoom = 390;
let sphereSize = 200;
let minCameraDistance = sphereSize / 2 + 5
let maxCameraDistance = cameraZoom * 1.5
let animateLastFrameTime = 0
let rotationAcceleration = 0.03
let rotationDampening = 0.05
let rotationSpeed = 0
let rotationSpeedMax = 2
let zoomAcceleration = 0.03
let zoomDampening = 0.05
let zoomSpeed = 0
let zoomSpeedMax = 1
let zoomScrollSpeed = 0.0005
let addedMeshes: THREE.Mesh[] = []

addUpdateListener((position, colorId) => {
  vertexColorIds[position * 3] = colorId
  vertexColorIds[position * 3 + 1] = colorId
  vertexColorIds[position * 3 + 2] = colorId
  sphere.geometry.attributes.vertexColorId.needsUpdate = true;
  renderer.render(scene, camera);
})

addUpdateBulkListener(() => {
  for (let i = 0; i < vertexColorIds.length; i+=3) {
    let colorId = stateColorIds[i/3]
    vertexColorIds[i] = colorId
    vertexColorIds[i+1] = colorId
    vertexColorIds[i+2] = colorId
  }
  sphere.geometry.attributes.vertexColorId.needsUpdate = true;
  renderer.render(scene, camera);
})

const props = defineProps<{
  sphereDetail: number
  selectedPosition: number|null
  rotateDirection: number
  zoomDirection: number
}>()

const emit = defineEmits(['selectPosition'])

const triangleClick = (event: MouseEvent) => {
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

function wheelEventHandler (event: WheelEvent) {
  const delta = event.deltaY * zoomScrollSpeed
  const currentZoom  = camera.position.length()
  const newZoom = clamp(currentZoom * (1 - delta), minCameraDistance, maxCameraDistance)
  setZoom(newZoom)
  event.preventDefault()
  requestAnimationFrame(() => {
    renderer.render(scene, camera)
  })
}

function animateControls () {
  if (
      rotationSpeed === 0 && props.rotateDirection === 0 &&
      zoomSpeed === 0 && props.zoomDirection === 0
  ) {
    return
  }
  if (props.rotateDirection !== 0) {
    rotationSpeed += rotationAcceleration * props.rotateDirection
  } else {
    rotationSpeed -= Math.min(rotationDampening, Math.abs(rotationSpeed)) * ((rotationSpeed > 0) ? 1 : -1)
    if (rotationSpeed < 0.0001 && rotationSpeed > -0.0001) {
      rotationSpeed = 0
    }
  }
  if (props.zoomDirection !== 0) {
    zoomSpeed += zoomAcceleration * props.zoomDirection
  } else {
    zoomSpeed -= Math.min(zoomDampening, Math.abs(zoomSpeed)) * ((zoomSpeed > 0) ? 1 : -1)
    if (zoomSpeed < 0.0001 && zoomSpeed > -0.0001) {
      zoomSpeed = 0
    }
  }
  // Clamp the speed
  rotationSpeed = clamp(rotationSpeed, -rotationSpeedMax, rotationSpeedMax)
  zoomSpeed = clamp(zoomSpeed, -zoomSpeedMax, zoomSpeedMax)

  const deltaTime = (Date.now() - animateLastFrameTime) / 1000

  // Perform rotation.
  camera.rotation.z += rotationSpeed * deltaTime;

  // Perform zoom, but only if the zoom limits have not be exceeded.
  const currentZoom  = camera.position.length()
  const newZoom = clamp(currentZoom * (1 - zoomSpeed * deltaTime), minCameraDistance, maxCameraDistance)
  if (newZoom == minCameraDistance) {
    zoomSpeed = 0
    setZoom(minCameraDistance)
  } else if (newZoom >= maxCameraDistance) {
    zoomSpeed = 0
    setZoom(maxCameraDistance)
  } else {
    setZoom(newZoom)
  }
  renderer.render(scene, camera)
  animateLastFrameTime = Date.now()
  requestAnimationFrame(animateControls)
}

function setZoom(zoom: number) {
  const maxCameraPosition = camera.position.normalize().multiplyScalar(zoom)
  camera.position.copy(maxCameraPosition)
}

watch(() => [props.rotateDirection, props.zoomDirection], () => {
  animateLastFrameTime = Date.now()
  animateControls()
})

watch(() => [props.selectedPosition], () => {
  if (props.selectedPosition === null) {
    // Hide selector.
    addedMeshes.forEach((mesh) => {
      scene.remove(mesh)
    })
    addedMeshes = []
  } else {
    // Show selectedPosition.
    const faceIndex = props.selectedPosition * 3 * 3

    // @ts-ignore
    const v1 = new THREE.Vector3(...sphere.geometry.attributes.position.array.slice(faceIndex, faceIndex + 3))
    // @ts-ignore
    const v2 = new THREE.Vector3(...sphere.geometry.attributes.position.array.slice(faceIndex + 3, faceIndex + 6))
    // @ts-ignore
    const v3 = new THREE.Vector3(...sphere.geometry.attributes.position.array.slice(faceIndex + 6, faceIndex + 9))

    const outerMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, transparent: true, opacity: 0.6 } );
    const innerMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, transparent: true, opacity: 0.6 } );

    addedMeshes.forEach((mesh) => {
      scene.remove(mesh)
    })

    addedMeshes = []
    const edgeOffset = 10 / props.sphereDetail
    const edgeLength = 41 / props.sphereDetail

    const outerGeom = getOuterEdgeMarkersGeometry(v1, v2, v3, edgeOffset, edgeLength)
    const outerMesh = new THREE.Mesh(outerGeom, outerMaterial );
    outerMesh.scale.multiplyScalar(1.0001)
    scene.add(outerMesh)
    addedMeshes.push(outerMesh)

    const innerGeom = getInnerEdgeMarkersGeometry(v1, v2, v3, edgeOffset, edgeLength)
    const innerMesh = new THREE.Mesh(innerGeom, innerMaterial );
    innerMesh.scale.multiplyScalar(1.0001)
    scene.add(innerMesh)
    addedMeshes.push(innerMesh)

    renderer.render(scene, camera);
  }
})

onMounted(() => {
  let sphereDetail = props.sphereDetail;
  if (window.innerWidth < window.innerHeight) {
    cameraZoom *= window.innerHeight/window.innerWidth
    maxCameraDistance = cameraZoom * 1.5
  }
  let cameraVector = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
  let cameraTrackballRadius = cameraZoom/cameraVector.distanceTo(new THREE.Vector3(0,0,0)) * cameraZoom

  const init = () => {

    camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.copy(cameraVector.multiplyScalar(cameraZoom))
    camera.lookAt(new THREE.Vector3())

    raycaster = new THREE.Raycaster();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const vertexShaderColorIdMapping = colorFloats.map((colorFloatArr, index) => {
      return `
    case ${index}:
      vColor = vec4(
        ${colorFloatArr[0]},
        ${colorFloatArr[1]},
        ${colorFloatArr[2]},
        1
      );
      break;
`
    })

    const vertexShader = `
attribute int vertexColorId;
varying vec4 vColor;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  switch (vertexColorId) {
${vertexShaderColorIdMapping.join('')}
  }
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
      depthTest: true
    });


    const radius = sphereSize/2;

    const geometry = new THREE.IcosahedronGeometry(radius, sphereDetail);

    console.log(geometry.attributes.position.count/3)
    vertexColorIds = new Int32Array(geometry.attributes.position.count);

    geometry.setAttribute('vertexColorId', new THREE.BufferAttribute(vertexColorIds, 1));

    sphere = new THREE.Mesh(geometry, shaderMaterial);
    scene.add(sphere);

    renderer = new THREE.WebGLRenderer();
    // @ts-ignore
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    createControls(camera)
    window.addEventListener('resize', onWindowResize);

    renderer.render(scene, camera);
  }

  function createControls( camera: THREE.Camera ) {
    const container = document.getElementById('container');
    container?.appendChild(renderer.domElement);
    container?.addEventListener( 'click', triangleClick, false );
    // touchEnd/mouseUp with no significant dragging should affect zoom + pan + focus (animated zoom).
    // - update selectedPosition
    // - Change zoom level to be 25% of what the current zoom is, with a maxZoom specifically for clicking.
    // - Change the position by following the great-circle path between the two points.
    // touchEnd/mouseUp with significant dragging should pan across the globe, but not focus.
    // - selected tile should stay underneath finger. Great circle distance between two
    // - release velocity should be measured by diff between touchMove and touchEnd.
    // - unknown: What if fingers are outside globe.
    // touchMove with two fingers should affect zoom. Distance between two points on a sphere should be consistent with zoom level.
    // - unknown: What if fingers are outside globe.
    // mouse wheel scroll should affect zoom.
    // left/right/up/down key should focus to nearest tile from current position.
    // SHIFT+LEFT should title camera left.
    // SHIFT+RIGHT should title camera right.
    // = or + key should zoom in
    // - or _ key should zoom out

    container?.addEventListener('wheel', wheelEventHandler, false );
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
