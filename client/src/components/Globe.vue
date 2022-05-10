<script setup lang="ts">
import * as THREE from 'three';
import { addUpdateListener, addUpdateBulkListener, stateColorIds } from "../utils/state"
import { watch, onMounted } from 'vue'
import {clamp, damp, lerp} from "three/src/math/MathUtils";
import {averageVector3} from "../utils/averageVector";
import {rotateCameraAlongAxis, rotateCameraAlongEyeAxis, zoomCameraToDistance} from "../utils/cameraActions";
import {getSphereShader} from "../utils/sphereMaterial";
import {createSelectedMarker} from "../utils/selectedMarker";

let renderer: THREE.Renderer
let scene: THREE.Scene
let camera: THREE.Camera
let raycaster: THREE.Raycaster
let sphere: THREE.Mesh;
let sphereSize = 200;
let vertexColorIds: Int32Array; // WebGl doesn't allow 8-bit arrays as attributes.
let selectedMarkerMeshes: THREE.Mesh[] = []
// Camera zoom settings.
let initialCameraZoom = 390;
let minCameraDistance = sphereSize / 2 + 5
let maxCameraDistance = initialCameraZoom * 1.5
// Used for managing the requestAnimationFrame() function.
let animated = false
let animateLastFrameTime = 0
// Used by the SHIFT + LEFT/RIGHT keys and the ⟳/⟲ control buttons.
let rotationAcceleration = 0.03
let rotationDampening = 0.05
let rotationSpeed = 0
let rotationSpeedMax = 2
// Used by the -/+ keys and the -/+ control buttons.
let zoomAcceleration = 0.03
let zoomDampening = 0.05
let zoomSpeed = 0
let zoomSpeedMax = 1
let zoomScrollSpeed = 0.0005
// Used by the mouse (Not touch events!)
let mouseDownPosition: THREE.Vector2|null = null
let mouseMovePosition: THREE.Vector2|null = null
let mouseMoveDistance: number = 0
let mouseMoveDistanceThreshold = 2
// Used by the mouse and touch events to spin the camera around the sphere.
let spinAxisMomentum: THREE.Vector3|null = null
let spinAngleMomentum: number = 0
let spinMomentumDampening = 0.01
// Used when the user mouse-ups or touches a position on the globe.
let animateToSelectedTimeStart: number = 0
let animateToSelectedTimeEnd: number = 0
let animateToSelectedTimeTotal: number = 1000
let animateToSelectedPosStart: THREE.Vector3|null = null
let animateToSelectedPosEnd: THREE.Vector3|null = null
let animateToSelectedZoomStart: number|null = null
let animateToSelectedZoomEnd: number|null = null
let animateToSelectedSuggestedZoom: number = minCameraDistance + 10

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

function getPointIntersectionAtScreenPosition(
    mousePosition: THREE.Vector2
): THREE.Vector3|null {
  const scenePosition = getScenePosition(mousePosition)
  raycaster.setFromCamera(scenePosition, camera);
  return raycaster.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), sphereSize / 2), new THREE.Vector3())
}

function getObjectIntersectionAtScreenPosition(
    mousePosition: THREE.Vector2
): THREE.Intersection<THREE.Object3D>|null {
  const scenePosition = getScenePosition(mousePosition)
  raycaster.setFromCamera(scenePosition, camera);
  const intersects = raycaster.intersectObjects( [sphere], true );

  if ( intersects.length === 0 ) {
    return null
  }
  // if there is one (or more) intersections, return the first.
  return intersects[ 0 ]
}

function getMousePosition (event: MouseEvent): THREE.Vector2 {
  return new THREE.Vector2(event.clientX, event.clientY) // 🐭
}

// Returns the position relative to the center of the screen
function getScenePosition (clientPosition: THREE.Vector2): THREE.Vector2 {
  const sceneX = ( clientPosition.x / window.innerWidth ) * 2 - 1
  const sceneY = - ( clientPosition.y / window.innerHeight ) * 2 + 1
  return new THREE.Vector2(sceneX, sceneY)
}

function getCenterScreenPosition (): THREE.Vector2 {
  return new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2)
}

const selectPosition = (mouse: THREE.Vector2) => {
  const intersection = getObjectIntersectionAtScreenPosition(mouse)
  if (
      intersection !== null &&
      intersection.face !== null &&
      intersection.face !== undefined
  ) {
    emit('selectPosition', Math.round(intersection.face.a / 3))
  }
}

function mouseDownEventHandler (event: MouseEvent) {
  mouseDownPosition = getMousePosition(event)
  spinAngleMomentum = 0
  spinAxisMomentum = null
}

function mouseMoveEventHandler (event: MouseEvent) {
  if (mouseDownPosition === null) {
    return // Do nothing if mouseDown has not occurred.
  }
  if (mouseMovePosition === null) {
    mouseMovePosition = mouseDownPosition
  }
  const mouseMovePositionNew = getMousePosition(event)

  mouseMoveDistance += mouseMovePosition.distanceTo(mouseMovePositionNew)

  // Rotate camera along axis.
  if (mouseMoveDistance >= mouseMoveDistanceThreshold) {
    const centerPosition = getCenterScreenPosition()
    const centerDeltaPosition = new THREE.Vector2().copy(mouseMovePositionNew)
    centerDeltaPosition.sub(mouseMovePosition)
    centerDeltaPosition.negate()
    centerDeltaPosition.add(centerPosition)

    const centerInt = getPointIntersectionAtScreenPosition(centerPosition)
    const centerDeltaInt = getPointIntersectionAtScreenPosition(centerDeltaPosition)

    if (centerInt === null || centerDeltaInt === null) {
      mouseDownPosition = null
      mouseMovePosition = null
      mouseMoveDistance = 0
      return
    }

    // Set the camera position and look at the origin
    let axis = new THREE.Vector3().crossVectors(centerInt, centerDeltaInt).normalize()
    let angle = centerInt.angleTo(centerDeltaInt)
    rotateCameraAlongAxis(camera, axis, angle)

    spinAxisMomentum = axis
    spinAngleMomentum = angle

    renderer.render(scene, camera)
  }

  mouseMovePosition = mouseMovePositionNew
}

function mouseLeaveEventHandler () {
  mouseDownPosition = null
  mouseMovePosition = null
  mouseMoveDistance = 0
}

function mouseUpEventHandler (event: MouseEvent) {
  const mouseUpPosition = getMousePosition(event)
  if (mouseMoveDistance < mouseMoveDistanceThreshold) {
    selectPosition(mouseUpPosition)
    requestAnimationFrame(() => {
      renderer.render(scene, camera)
    })
  }
  if (spinAngleMomentum > 0) {
    requestAnimateControls()
  }
  mouseDownPosition = null
  mouseMovePosition = null
  mouseMoveDistance = 0
}

function wheelEventHandler (event: WheelEvent) {
  clearAnimateToSelected()
  const delta = event.deltaY * zoomScrollSpeed
  const currentZoom  = camera.position.length()
  const newZoom = clamp(currentZoom * (1 - delta), minCameraDistance, maxCameraDistance)
  zoomCameraToDistance(camera, newZoom)
  event.preventDefault()
  requestAnimationFrame(() => {
    renderer.render(scene, camera)
  })
}

/**
 * To prevent multiple `requestAnimationFrame()` requests happening at once,
 * we enforce that a request can only be made if one is not already being executed.
 */
function requestAnimateControls () {
  if (animated) {
    return
  }
  animated = true
  animateLastFrameTime = Date.now()
  requestAnimationFrame(animateControls)
}

function animateControls () {
  if (
      rotationSpeed === 0 && props.rotateDirection === 0 &&
      zoomSpeed === 0 && props.zoomDirection === 0 &&
      spinAngleMomentum === 0 &&
      animateToSelectedPosEnd === null// && animateToSelectedZoom !== null
  ) {
    animated = false
    return
  }

  // Accelerate the rotation speed, otherwise, dampen it.
  if (props.rotateDirection !== 0) {
    rotationSpeed += rotationAcceleration * props.rotateDirection
  } else {
    rotationSpeed -= Math.min(rotationDampening, Math.abs(rotationSpeed)) * ((rotationSpeed > 0) ? 1 : -1)
    if (rotationSpeed < 0.0001 && rotationSpeed > -0.0001) {
      rotationSpeed = 0
    }
  }

  // Accelerate the zoom speed, otherwise, dampen it.
  if (props.zoomDirection !== 0) {
    zoomSpeed += zoomAcceleration * props.zoomDirection
  } else {
    zoomSpeed -= Math.min(zoomDampening, Math.abs(zoomSpeed)) * ((zoomSpeed > 0) ? 1 : -1)
    if (zoomSpeed < 0.0001 && zoomSpeed > -0.0001) {
      zoomSpeed = 0
    }
  }

  // Dampen the spin (Used when )
  if (spinAngleMomentum > 0) {
    spinAngleMomentum -= spinMomentumDampening
    if (spinAngleMomentum < 0.0001) {
      spinAngleMomentum = 0
      spinAxisMomentum = null
    }
  }

  // Clamp the speed. 🗜
  rotationSpeed = clamp(rotationSpeed, -rotationSpeedMax, rotationSpeedMax)
  zoomSpeed = clamp(zoomSpeed, -zoomSpeedMax, zoomSpeedMax)

  const deltaTime = (Date.now() - animateLastFrameTime) / 1000

  // Perform spinning. 🩰
  if (spinAxisMomentum !== null) {
    rotateCameraAlongAxis(camera, spinAxisMomentum, spinAngleMomentum)
  }

  const animateToSelectedDuration = Math.min(1, (Date.now() - animateToSelectedTimeStart) / animateToSelectedTimeTotal)

  if (animateToSelectedPosEnd !== null) {
    const animateToSelectedTargetAxis = new THREE.Vector3().crossVectors(animateToSelectedPosStart, animateToSelectedPosEnd).normalize()
    const animateToSelectedTargetTotalAngle = animateToSelectedPosStart.angleTo(animateToSelectedPosEnd)
    const animateToSelectedTargetCurrentAngle = animateToSelectedTargetTotalAngle - camera.position.angleTo(animateToSelectedPosEnd)
    const interpolatedAngle = damp(animateToSelectedTargetCurrentAngle, animateToSelectedTargetTotalAngle, 0.5, animateToSelectedDuration)
    rotateCameraAlongAxis(camera, animateToSelectedTargetAxis, interpolatedAngle - animateToSelectedTargetCurrentAngle)
  }

  if (animateToSelectedZoomEnd !== null) {
    const interpolatedZoom = lerp(animateToSelectedZoomStart, animateToSelectedZoomEnd, animateToSelectedDuration)
    zoomCameraToDistance(camera, interpolatedZoom)
  }

  if (animateToSelectedDuration >= 1) {
    clearAnimateToSelected()
  }

  // Perform rotation. 🙃
  if (rotationSpeed !== 0) {
    rotateCameraAlongEyeAxis(camera, rotationSpeed * deltaTime)
  }

  // Perform zoom. 🏎 But only if the zoom limits have not be exceeded.
  if (zoomSpeed !== 0) {
    const currentZoom = camera.position.length()
    const newZoom = clamp(currentZoom * (1 - zoomSpeed * deltaTime), minCameraDistance, maxCameraDistance)
    if (newZoom == minCameraDistance) {
      zoomSpeed = 0
      zoomCameraToDistance(camera, minCameraDistance)
    } else if (newZoom >= maxCameraDistance) {
      zoomSpeed = 0
      zoomCameraToDistance(camera, maxCameraDistance)
    } else {
      zoomCameraToDistance(camera, newZoom)
    }
  }
  renderer.render(scene, camera)
  animateLastFrameTime = Date.now()
  requestAnimationFrame(animateControls)
}

function setAnimateToTarget(target: THREE.Vector3) {
  const currentCameraZoom = camera.position.length()

  animateToSelectedPosStart = camera.position.clone()
  animateToSelectedPosEnd = target
  animateToSelectedZoomStart = currentCameraZoom
  animateToSelectedZoomEnd = Math.min(animateToSelectedSuggestedZoom, currentCameraZoom)
  animateToSelectedTimeStart = Date.now()
  animateToSelectedTimeEnd = Date.now() + animateToSelectedTimeTotal
}

function clearAnimateToSelected() {
  animateToSelectedPosStart = null
  animateToSelectedPosEnd = null
  animateToSelectedZoomStart = null
  animateToSelectedZoomEnd = null
  animateToSelectedTimeStart = 0
  animateToSelectedTimeEnd = 0
}

watch(() => [props.rotateDirection, props.zoomDirection], () => {
  clearAnimateToSelected()
  requestAnimateControls()
})

watch(() => [props.selectedPosition], () => {
  if (props.selectedPosition === null) {
    // Remove the marker.
    selectedMarkerMeshes.forEach((mesh) => { scene.remove(mesh) })
    selectedMarkerMeshes = []
  } else {
    // Display the marker.
    const faceIndex = props.selectedPosition * 3 * 3
    // @ts-ignore
    const v1 = new THREE.Vector3(...sphere.geometry.attributes.position.array.slice(faceIndex, faceIndex + 3))
    // @ts-ignore
    const v2 = new THREE.Vector3(...sphere.geometry.attributes.position.array.slice(faceIndex + 3, faceIndex + 6))
    // @ts-ignore
    const v3 = new THREE.Vector3(...sphere.geometry.attributes.position.array.slice(faceIndex + 6, faceIndex + 9))
    // Remove the old and add the new selected Marker Meshes.
    selectedMarkerMeshes.forEach((mesh) => { scene.remove(mesh) })
    selectedMarkerMeshes = createSelectedMarker(v1, v2, v3, props.sphereDetail)
    selectedMarkerMeshes.forEach((mesh) => { scene.add(mesh) })

    // Animate to the selected marker.
    setAnimateToTarget(averageVector3(v1, v2, v3))
    console.log('selected')
    requestAnimateControls()
  }
  renderer.render(scene, camera);
})

onMounted(() => {
  let sphereDetail = props.sphereDetail;
  if (window.innerWidth < window.innerHeight) {
    initialCameraZoom *= window.innerHeight/window.innerWidth
    maxCameraDistance = initialCameraZoom * 1.5
  }
  // Pick a random camera position so the user isn't present with the same view as
  // everyone else. This should prevent favouritism.
  let cameraVector = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();

  const init = () => {
    // Setup the camera.
    camera = new THREE.PerspectiveCamera(
        30,
        window.innerWidth / window.innerHeight,
        1,
        10000
    );
    camera.position.copy(cameraVector.multiplyScalar(initialCameraZoom))
    camera.lookAt(new THREE.Vector3())

    raycaster = new THREE.Raycaster();

    // Setup the Scene with a black background.
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const radius = sphereSize / 2;
    const geometry = new THREE.IcosahedronGeometry(radius, sphereDetail);

    console.log(geometry.attributes.position.count / 3)
    vertexColorIds = new Int32Array(geometry.attributes.position.count);
    geometry.setAttribute('vertexColorId', new THREE.BufferAttribute(vertexColorIds, 1));

    sphere = new THREE.Mesh(geometry, getSphereShader());
    scene.add(sphere);

    // Create the renderer.
    renderer = new THREE.WebGLRenderer();
    // @ts-ignore
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);

    createControls()
  }

  function createControls() {
    const container = document.getElementById('container');
    container?.appendChild(renderer.domElement);
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
    container?.addEventListener('mousedown', mouseDownEventHandler)
    window?.addEventListener('mousemove', mouseMoveEventHandler)
    window?.addEventListener('mouseup', mouseUpEventHandler)
    container?.addEventListener('wheel', wheelEventHandler);
    window.addEventListener('resize', onWindowResize);
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
