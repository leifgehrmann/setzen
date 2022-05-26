<script setup lang="ts">
import * as THREE from 'three';
import { addUpdateListener, addUpdateBulkListener, stateColorIds } from "../utils/state"
import { watch, onMounted } from 'vue'
import {clamp, damp, lerp} from "three/src/math/MathUtils";
import {averageVector2, averageVector3} from "../utils/averageVector";
import {rotateCameraAlongAxis, rotateCameraAlongEyeAxis, zoomCameraToDistance} from "../utils/cameraActions";
import {getSphereShader} from "../utils/sphereMaterial";
import {createSelectedMarker} from "../utils/selectedMarker";
import {getTouchById} from "../utils/touchUtils";
import {colors} from "../utils/colors";
import {getSavedCameraState, saveCameraState} from "../utils/cameraState";

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
// Used by the LEFT/RIGHT/UP/DOWN keys
let moveAcceleration = 0.5
let moveDampening = 0.5
let moveXSpeed = 0
let moveYSpeed = 0
let moveSpeedMax = 0.01
// Used by the SHIFT + LEFT/RIGHT keys and the ⟳/⟲ control buttons.
let rotationAcceleration = 0.03
let rotationDampening = 0.2
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
// Used for touch events.
let touchId1: number|null = null
let touchId1StartPos: THREE.Vector2|null = null
let touchId1MovePos: THREE.Vector2|null = null
let touchId1MoveDistance: number = 0
let touchId2: number|null = null
let touchId2StartPos: THREE.Vector2|null = null
let touchId2MovePos: THREE.Vector2|null = null
let touchId2MoveDistance: number = 0
let touchMoveDistanceThreshold = 10
let touchLastEventTime: number = 0
// Used by the mouse and touch events to spin the camera around the sphere.
let spinAxisMomentum: THREE.Vector3|null = null
let spinAngleMomentum: number = 0
let spinMomentumDampening = 0.01
// Used by the touch events to zoom the camera in and out.
let zoomMomentum = 0
let zoomMomentumDampening = 0.1
// Used by the touch events to rotate the camera.
let rotateMomentum = 0
let rotateMomentumDampening = 0.01
// Used when the user mouse-ups or touches a position on the globe.
let animateToSelectedTimeStart: number = 0
let animateToSelectedTimeEnd: number = 0
let animateToSelectedTimeTotal: number = 1000
let animateToSelectedPosStart: THREE.Vector3|null = null
let animateToSelectedPosEnd: THREE.Vector3|null = null
let animateToSelectedZoomStart: number|null = null
let animateToSelectedZoomEnd: number|null = null
let animateToSelectedSuggestedZoom: number = minCameraDistance + 10
let animateToSelectedSuggestedMaxZoom: number = minCameraDistance + 150

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
  moveXDirection: number // -1, 0, 1
  moveYDirection: number // -1, 0, 1
  rotateDirection: number // -1, 0, 1
  zoomDirection: number // -1, 0, 1
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

function getTouchPosition (event: Touch): THREE.Vector2 {
  return new THREE.Vector2(event.clientX, event.clientY) // 👆
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
  clearAnimateToSelected()
  // Reset spin.
  spinAngleMomentum = 0
  spinAxisMomentum = null
}

function mouseMoveEventHandler (event: MouseEvent) {
  if (mouseDownPosition === null) {
    return // Do nothing if mouseDown has not occurred.
  }
  clearAnimateToSelected()
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
    saveCameraState(camera)
  }

  mouseMovePosition = mouseMovePositionNew
}

function mouseLeaveEventHandler () {
  mouseDownPosition = null
  mouseMovePosition = null
  mouseMoveDistance = 0
}

function mouseUpEventHandler (event: MouseEvent) {
  if (mouseDownPosition === null) {
    return
  }
  const mouseUpPosition = getMousePosition(event)
  if (mouseMoveDistance < mouseMoveDistanceThreshold) {
    selectPosition(mouseUpPosition)
    requestAnimationFrame(() => {
      renderer.render(scene, camera)
      saveCameraState(camera)
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
    saveCameraState(camera)
  })
}

function touchStartEventHandler (event: TouchEvent) {
  event.preventDefault()
  clearAnimateToSelected()
  const touches = event.changedTouches
  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i]
    if (touchId1 === null) {
      touchId1 = touch.identifier
      touchId1StartPos = getTouchPosition(touch)
      touchId1MoveDistance = 0
    } else if (touchId2 === null) {
      touchId2 = touch.identifier
      touchId2StartPos = getTouchPosition(touch)
      touchId2MoveDistance = 0
    }
  }
  // Reset touch.
  zoomMomentum = 0
  spinAngleMomentum = 0
  spinAxisMomentum = null

  touchLastEventTime = Date.now()
}

function touchMoveEventHandler (event: TouchEvent) {
  event.preventDefault()
  clearAnimateToSelected()

  let render = false
  let touchId1MovePosNew: THREE.Vector2|null = null
  let touchId2MovePosNew: THREE.Vector2|null = null

  if (touchId1MovePos === null) {
    touchId1MovePos = touchId1StartPos
  }
  if (touchId2MovePos === null) {
    touchId2MovePos = touchId2StartPos
  }

  const touch1 = touchId1 !== null ? getTouchById(event.touches, touchId1) : null
  const touch2 = touchId2 !== null ? getTouchById(event.touches, touchId2) : null
  if (touch1 !== null && touchId1MovePos !== null) {
    touchId1MovePosNew = getTouchPosition(touch1)
    touchId1MoveDistance += touchId1MovePos.distanceTo(touchId1MovePosNew)
  }
  if (touch2 !== null && touchId2MovePos !== null) {
    touchId2MovePosNew = getTouchPosition(touch2)
    touchId2MoveDistance += touchId2MovePos.distanceTo(touchId2MovePosNew)
  }

  // Adjust position
  if (
      touchId1MoveDistance > touchMoveDistanceThreshold &&
      touchId1MovePos !== null &&
      touchId1MovePosNew !== null
  ) {
    const centerPosition = getCenterScreenPosition()
    let centerDeltaPosition = new THREE.Vector2()
    let centerInt: THREE.Vector3|null
    let centerDeltaInt: THREE.Vector3|null
    if (
        touch2 !== null &&
        touchId2MovePos !== null &&
        touchId2MovePosNew !== null
    ) {
      centerDeltaPosition.copy(averageVector2(touchId1MovePosNew, touchId2MovePosNew))
      centerDeltaPosition.sub(averageVector2(touchId1MovePos, touchId2MovePos))
      centerDeltaPosition.negate()
      centerDeltaPosition.add(centerPosition)
      centerDeltaInt = getPointIntersectionAtScreenPosition(centerDeltaPosition)
    } else {
      centerDeltaPosition.copy(touchId1MovePosNew)
      centerDeltaPosition.sub(touchId1MovePos)
      centerDeltaPosition.negate()
      centerDeltaPosition.add(centerPosition)
      centerDeltaInt = getPointIntersectionAtScreenPosition(centerDeltaPosition)
    }

    centerInt = getPointIntersectionAtScreenPosition(centerPosition)

    if (centerInt === null || centerDeltaInt === null) {
      touchId1 = null
      touchId1StartPos = null
      touchId1MovePos = null
      touchId1MoveDistance = 0
      return
    }

    // Set the camera position and look at the origin
    let axis = new THREE.Vector3().crossVectors(centerInt, centerDeltaInt).normalize()
    let angle = centerInt.angleTo(centerDeltaInt)
    rotateCameraAlongAxis(camera, axis, angle)

    spinAxisMomentum = axis
    spinAngleMomentum = angle
    render = true
  }

  if (touch2 !== null && touchId2MovePos !== null) {
    touchId2MovePosNew = getTouchPosition(touch2)
    touchId2MoveDistance += touchId2MovePos.distanceTo(touchId2MovePosNew)

    if (
        touchId1MoveDistance > touchMoveDistanceThreshold &&
        touchId1MovePos !== null &&
        touchId2MovePos !== null &&
        touchId1MovePosNew !== null
    ) {
      const beforeDelta = touchId1MovePos.clone()
      beforeDelta.sub(touchId2MovePos)
      const afterDelta = touchId1MovePosNew.clone()
      afterDelta.sub(touchId2MovePosNew)
      const angleDelta = afterDelta?.angle() - beforeDelta?.angle()
      rotateCameraAlongEyeAxis(camera, angleDelta)
      rotateMomentum = angleDelta

      const pinchDelta = afterDelta.length() - beforeDelta.length()
      const centerPosition = getCenterScreenPosition()
      const screenDeltaA = centerPosition.clone().add(new THREE.Vector2(pinchDelta / 2, 0))
      const screenDeltaB = centerPosition.clone().sub(new THREE.Vector2(pinchDelta / 2, 0))
      const sceneDeltaA = getPointIntersectionAtScreenPosition(screenDeltaA)
      const sceneDeltaB = getPointIntersectionAtScreenPosition(screenDeltaB)
      const currentZoom = camera.position.length()
      if (sceneDeltaA !== null && sceneDeltaB !== null) {
        let angle = sceneDeltaA.angleTo(sceneDeltaB)
        if (pinchDelta > 0) {
          angle *= -1
        }
        let zoomFactor = (angle * (1 - Math.min(0.9, (currentZoom - minCameraDistance) / (maxCameraDistance - minCameraDistance)))) * 5
        zoomMomentum = zoomFactor
        const newZoom = clamp(currentZoom * (1 + zoomFactor), minCameraDistance, maxCameraDistance)
        zoomCameraToDistance(camera, newZoom)
        render = true
      }
    }
  }

  if (touchId1MovePosNew !== null) {
    touchId1MovePos = touchId1MovePosNew
  }

  if (touchId2MovePosNew !== null) {
    touchId2MovePos = touchId2MovePosNew
  }

  if (render) {
    renderer.render(scene, camera)
    saveCameraState(camera)
  }

  touchLastEventTime = Date.now()
}

function touchEndEventHandler (event: TouchEvent) {
  if (touchId2 !== null) {
    const touch2 = getTouchById(event.changedTouches, touchId2)
    if (touch2 !== null) {
      touchId2 = null
      touchId2StartPos = null
      touchId2MovePos = null
      touchId2MoveDistance = 0
    }
  }
  if (touchId1 !== null) {
    const touch1 = getTouchById(event.changedTouches, touchId1)
    if (touch1 !== null) {
      if (touchId2 !== null) {
        touchId1 = touchId2
        touchId1StartPos = touchId2StartPos
        touchId1MovePos = touchId2MovePos
        touchId1MoveDistance = touchId2MoveDistance
        touchId2 = null
        touchId2StartPos = null
        touchId2MovePos = null
        touchId2MoveDistance = 0
      } else {
        const touch1Pos = getTouchPosition(touch1)
        if (touchId1MoveDistance < touchMoveDistanceThreshold) {
          selectPosition(touch1Pos)
          requestAnimationFrame(() => {
            renderer.render(scene, camera)
            saveCameraState(camera)
          })
        }
        touchId1 = null
        touchId1StartPos = null
        touchId1MovePos = null
        touchId1MoveDistance = 0
      }
    } else {
    }
  }

  if (
      touchId1 === null && touchId2 === null &&
      (spinAngleMomentum > 0 || zoomMomentum !== 0 || rotateMomentum !== 0) &&
      (Date.now() - touchLastEventTime) < 500
  ) {
    requestAnimateControls()
  }

  // Clear touches that are no longer being tracked. This can
  // happen when two fingers come close together, effectively
  // becoming a single touch.
  if (touchId2 !== null) {
    const touch2 = getTouchById(event.touches, touchId2)
    if (touch2 === null) {
      touchId2 = null
      touchId2StartPos = null
      touchId2MovePos = null
      touchId2MoveDistance = 0
    }
  }
  if (touchId1 !== null) {
    const touch1 = getTouchById(event.touches, touchId1)
    if (touch1 === null) {
      touchId1 = null
      touchId1StartPos = null
      touchId1MovePos = null
      touchId1MoveDistance = 0
    }
  }

  touchLastEventTime = Date.now()
}

function touchCancelEventHandler (event: TouchEvent) {

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
      moveXSpeed === 0 && props.moveXDirection === 0 &&
      moveYSpeed === 0 && props.moveYDirection === 0 &&
      rotationSpeed === 0 && props.rotateDirection === 0 &&
      zoomSpeed === 0 && props.zoomDirection === 0 &&
      spinAngleMomentum === 0 &&
      zoomMomentum === 0 &&
      rotateMomentum === 0 &&
      animateToSelectedPosEnd === null// && animateToSelectedZoom !== null
  ) {
    animated = false
    return
  }

  const currentZoom = camera.position.length()

  // Accelerate the move speed, otherwise, dampen it.
  if (props.moveXDirection !== 0) {
    moveXSpeed += moveAcceleration * props.moveXDirection * Math.max(0.0001, (currentZoom - minCameraDistance) / (maxCameraDistance - minCameraDistance))
  } else {
    moveXSpeed -= Math.min(moveDampening, Math.abs(moveXSpeed)) * ((moveXSpeed > 0) ? 1 : -1)
    if (moveXSpeed < 0.0001 && moveXSpeed > -0.0001) {
      moveXSpeed = 0
    }
  }
  if (props.moveYDirection !== 0) {
    moveYSpeed += moveAcceleration * props.moveYDirection * Math.max(0.0001, (currentZoom - minCameraDistance) / (maxCameraDistance - minCameraDistance))
  } else {
    moveYSpeed -= Math.min(moveDampening, Math.abs(moveYSpeed)) * ((moveYSpeed > 0) ? 1 : -1)
    if (moveYSpeed < 0.0001 && moveYSpeed > -0.0001) {
      moveYSpeed = 0
    }
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

  // Dampen the spin (Used when swiping the mouse or swiping the touch display)
  if (spinAngleMomentum > 0) {
    spinAngleMomentum -= spinMomentumDampening * Math.max(0.01, (currentZoom - minCameraDistance) / (maxCameraDistance - minCameraDistance))
    if (spinAngleMomentum < 0.0001) {
      spinAngleMomentum = 0
      spinAxisMomentum = null
    }
  }

  // Dampen the spin (Used when swiping the mouse or swiping the touch display)
  if (zoomMomentum > 0) {
    zoomMomentum -= zoomMomentumDampening * Math.max(0.01, (currentZoom - minCameraDistance) / (maxCameraDistance - minCameraDistance))
    if (zoomMomentum < 0.0001) {
      zoomMomentum = 0
    }
  }
  if (zoomMomentum < 0) {
    zoomMomentum += zoomMomentumDampening * Math.max(0.01, (currentZoom - minCameraDistance) / (maxCameraDistance - minCameraDistance))
    if (zoomMomentum > -0.0001) {
      zoomMomentum = 0
    }
  }

  // Dampen the rotation (Used when swiping the mouse or swiping the touch display)
  if (rotateMomentum > 0) {
    rotateMomentum -= rotateMomentumDampening
    if (rotateMomentum < 0.0001) {
      rotateMomentum = 0
    }
  }
  if (rotateMomentum < 0) {
    rotateMomentum += rotateMomentumDampening
    if (rotateMomentum > -0.0001) {
      rotateMomentum = 0
    }
  }

  // Clamp the speed. 🗜
  moveXSpeed = clamp(moveXSpeed, -moveSpeedMax * Math.max(0.01, (currentZoom - minCameraDistance) / (maxCameraDistance - minCameraDistance)), moveSpeedMax * Math.max(0.01, (currentZoom - minCameraDistance) / (maxCameraDistance - minCameraDistance)))
  moveYSpeed = clamp(moveYSpeed, -moveSpeedMax * Math.max(0.01, (currentZoom - minCameraDistance) / (maxCameraDistance - minCameraDistance)), moveSpeedMax * Math.max(0.01, (currentZoom - minCameraDistance) / (maxCameraDistance - minCameraDistance)))
  rotationSpeed = clamp(rotationSpeed, -rotationSpeedMax, rotationSpeedMax)
  zoomSpeed = clamp(zoomSpeed, -zoomSpeedMax, zoomSpeedMax)

  const deltaTime = (Date.now() - animateLastFrameTime) / 1000

  // Perform spinning. 🩰
  if (spinAxisMomentum !== null) {
    rotateCameraAlongAxis(camera, spinAxisMomentum, spinAngleMomentum)
  }

  // Perform zooming. 🏎
  if (zoomMomentum !== 0) {
    const newZoom = clamp(currentZoom * (1 + zoomMomentum * deltaTime), minCameraDistance, maxCameraDistance)
    zoomCameraToDistance(camera, newZoom)
  }

  // Perform rotation.
  if (rotateMomentum !== 0) {
    rotateCameraAlongEyeAxis(camera, rotateMomentum)
  }

  const animateToSelectedDuration = Math.min(1, (Date.now() - animateToSelectedTimeStart) / animateToSelectedTimeTotal)

  if (animateToSelectedPosStart !== null && animateToSelectedPosEnd !== null) {
    const animateToSelectedTargetAxis = new THREE.Vector3().crossVectors(animateToSelectedPosStart, animateToSelectedPosEnd).normalize()
    const animateToSelectedTargetTotalAngle = animateToSelectedPosStart.angleTo(animateToSelectedPosEnd)
    const animateToSelectedTargetCurrentAngle = animateToSelectedTargetTotalAngle - camera.position.angleTo(animateToSelectedPosEnd)
    const interpolatedAngle = damp(animateToSelectedTargetCurrentAngle, animateToSelectedTargetTotalAngle, 0.5, animateToSelectedDuration)
    rotateCameraAlongAxis(camera, animateToSelectedTargetAxis, interpolatedAngle - animateToSelectedTargetCurrentAngle)
  }

  if (animateToSelectedZoomStart !== null && animateToSelectedZoomEnd !== null) {
    const interpolatedZoom = lerp(animateToSelectedZoomStart, animateToSelectedZoomEnd, animateToSelectedDuration)
    zoomCameraToDistance(camera, interpolatedZoom)
  }

  if (animateToSelectedDuration >= 1 || moveYSpeed !== 0 || moveXSpeed !== 0) {
    clearAnimateToSelected()
  }

  // Perform movement.
  if (moveYSpeed !== 0 || moveXSpeed !== 0) {
    const moveVector = new THREE.Vector2(-moveYSpeed, moveXSpeed) // Rotated -90 deg
    const moveAxis = new THREE.Vector3().crossVectors(camera.position, camera.up).normalize()
    const moveQuaternion = new THREE.Quaternion().setFromAxisAngle( camera.position.clone().normalize(), moveVector.angle());
    moveAxis.applyQuaternion(moveQuaternion)
    const moveAngle = moveVector.length()
    rotateCameraAlongAxis(camera, moveAxis, -moveAngle)
  }

  // Perform rotation. 🙃
  if (rotationSpeed !== 0) {
    rotateCameraAlongEyeAxis(camera, rotationSpeed * deltaTime)
  }

  // Perform zoom. 🏎 But only if the zoom limits have not be exceeded.
  if (zoomSpeed !== 0) {
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
  saveCameraState(camera)
  animateLastFrameTime = Date.now()
  requestAnimationFrame(animateControls)
}

function setAnimateToTarget(target: THREE.Vector3) {
  const currentCameraZoom = camera.position.length()

  animateToSelectedPosStart = camera.position.clone()
  animateToSelectedPosEnd = target
  animateToSelectedZoomStart = currentCameraZoom
  if (currentCameraZoom < animateToSelectedSuggestedMaxZoom) {
    animateToSelectedZoomEnd = currentCameraZoom
  } else {
    animateToSelectedZoomEnd = animateToSelectedSuggestedZoom
  }
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

watch(() => [props.moveXDirection, props.moveYDirection, props.rotateDirection, props.zoomDirection], () => {
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
    requestAnimateControls()
  }
  renderer.render(scene, camera);
  saveCameraState(camera)
})

onMounted(() => {
  let sphereDetail = props.sphereDetail;
  if (window.innerWidth < window.innerHeight) {
    initialCameraZoom *= window.innerHeight/window.innerWidth
    maxCameraDistance = initialCameraZoom * 1.5
  }

  const init = () => {
    // Setup the camera.
    camera = new THREE.PerspectiveCamera(
        30,
        window.innerWidth / window.innerHeight,
        1,
        10000
    );

    const savedCameraState = getSavedCameraState()
    if (savedCameraState === null) {
      // Pick a random camera position so the user isn't presented with the same view as
      // everyone else. This should prevent favouritism.
      let cameraVector = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
      camera.position.copy(cameraVector.multiplyScalar(initialCameraZoom))
      camera.lookAt(new THREE.Vector3())
    } else {
      camera.position.copy(savedCameraState.position)
      camera.up.copy(savedCameraState.up)
      camera.lookAt(new THREE.Vector3())
    }

    raycaster = new THREE.Raycaster();

    // Setup the Scene with a black background.
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const radius = sphereSize / 2;
    const geometry = new THREE.IcosahedronGeometry(radius, sphereDetail);

    // console.log(geometry.attributes.position.count / 3)
    vertexColorIds = new Int32Array(geometry.attributes.position.count);

    // To avoid the world appearing a certain color, default the map color to black.
    const colorIdBlack = Math.max(0, colors.indexOf('#000000'))
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      vertexColorIds[i] = colorIdBlack
    }

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
    container?.addEventListener('touchstart', touchStartEventHandler)
    window?.addEventListener('mousemove', mouseMoveEventHandler)
    window?.addEventListener('touchmove', touchMoveEventHandler)
    window?.addEventListener('mouseup', mouseUpEventHandler)
    window?.addEventListener('touchend', touchEndEventHandler)
    window?.addEventListener('touchcancel', touchCancelEventHandler)
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
  <div id="container" class="cursor-pointer" tabindex="-1"></div>
</template>
