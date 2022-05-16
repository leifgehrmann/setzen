<script setup lang="ts">
import './index.css'
import closeImage from './assets/close.svg'
import menuImage from './assets/menu.svg'
import infoImage from './assets/info.svg'
import rotateAntiClockwiseImage from './assets/rotate-anti-clockwise.svg'
import rotateClockwiseImage from './assets/rotate-clockwise.svg'
import zoomOutImage from './assets/zoom-out.svg'
import zoomInImage from './assets/zoom-in.svg'
import Globe from './components/Globe.vue'
import ColorSelector from "./components/ColorSelector.vue";
import WebSocketState from "./components/WebSocketState.vue";
import { ref, onMounted } from 'vue'
import {
  initState,
  getStateColorId,
  loadFromLocalStorage,
  addUpdateBulkListener,
  persistToLocalStorage,
  addUpdateListener, provisionalUpdate, triggerBulkUpdate
} from './utils/state';
import { initWebSocket, synchronise, requestUpdate } from "./utils/webSocket";
import RoundButton from "./components/RoundButton.vue";
import IncrementerButtons from "./components/IncrementerButtons.vue";
import Info from "./components/Info.vue";

let sphereDetail = 224
let sphereFaceCount = 20 * (sphereDetail + 1) * (sphereDetail + 1)
let chunkSize = 16875 // See /server/sendmessage/app.js

let showControls = ref(false)
let cameraMoveXDirection = ref(0)
let cameraMoveYDirection = ref(0)
let cameraZoomDirection = ref(0)
let cameraRotateDirection = ref(0)
let percentLoaded = ref(0)
let connecting = ref(false)
let connected = ref(false)
let selectedPosition = ref(null as number|null)

initState(sphereFaceCount, chunkSize)
loadFromLocalStorage()
addUpdateBulkListener(() => { persistToLocalStorage() })
addUpdateListener(() => { persistToLocalStorage() })
triggerBulkUpdate()

function updateMoveXDirection (newDirection: number) {
  cameraMoveXDirection.value = newDirection
}

function updateMoveYDirection(newDirection: number) {
  cameraMoveYDirection.value = newDirection
}

function updateRotateDirection (newDirection: number) {
  cameraRotateDirection.value = newDirection
}

function updateZoomDirection(newDirection: number) {
  cameraZoomDirection.value = newDirection
}

function selectPosition(position: number|null) {
  selectedPosition.value = position
}

function updateColorId(colorId: number) {
  const position = selectedPosition.value
  if (position === null) {
    return
  }
  if (getStateColorId(position) === colorId) {
    // Don't send an update if the colors are the same.
    return
  }
  if (percentLoaded.value !== 100) {
    console.error('Cannot send update while not fully loaded.')
    return
  }
  if (!connected.value) {
    console.error('Cannot send update while disconnected.')
    return
  }
  console.log('updateColorId', position, colorId)
  requestUpdate(position, colorId)
  setTimeout(() => {
    if (!connected.value) {
      console.error('Cannot send update while disconnected.')
      return
    }
    provisionalUpdate(position, colorId)
  }, 100)
}

function startWebSocket() {
  connecting.value = true
  initWebSocket(() => {
    synchronise((newPercentLoaded) => {
      percentLoaded.value = newPercentLoaded
    })
    connecting.value = false
    connected.value = true
  },() => {
    connected.value = false
  })
}

onMounted(() => {
  startWebSocket()

  if (window.innerWidth > 768) {
    showControls.value = true
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Minus') {
      updateZoomDirection(-1)
    } else if (event.code === 'Equal') {
      updateZoomDirection(1)
    } else if (event.shiftKey && event.code === 'ArrowLeft') {
      updateRotateDirection(-1)
    } else if (event.shiftKey && event.code === 'ArrowRight') {
      updateRotateDirection(1)
    } else if (event.code === 'ArrowLeft') {
      updateMoveXDirection(-1)
    } else if (event.code === 'ArrowRight') {
      updateMoveXDirection(1)
    } else if (event.code === 'ArrowDown') {
      updateMoveYDirection(-1)
    } else if (event.code === 'ArrowUp') {
      updateMoveYDirection(1)
    }
  })

  window.addEventListener('keyup', (event) => {
    if (event.code === 'Minus' || event.code === 'Equal') {
      updateZoomDirection(0)
    } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      updateRotateDirection(0)
      updateMoveXDirection(0)
    } else if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
      updateMoveYDirection(0)
    }
  })

  window.addEventListener('keypress', (event) => {
    if (event.code === 'Escape') {
      selectPosition(null)
    } else if (event.code === 'Period') {
      const container = document.getElementById('container')
      if (container !== null) {
        container.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          clientX: window.innerWidth / 2,
          clientY: window.innerHeight / 2
        }))
        container.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true,
          clientX: window.innerWidth / 2,
          clientY: window.innerHeight / 2
        }))
      }
    }
  })
})

</script>

<template>
  <div v-show="false" class="select-none touch-manipulation relative">
    <Globe
        :sphere-detail="sphereDetail"
        :selected-position="selectedPosition"
        :move-x-direction="cameraMoveXDirection"
        :move-y-direction="cameraMoveYDirection"
        :rotate-direction="cameraRotateDirection"
        :zoom-direction="cameraZoomDirection"
        @select-position="selectPosition"
    />
    <div
        class="
          absolute
          flex justify-center inset-x-0 text-center pointer-events-none cursor-default
          transition-all ease-in-out duration-300
        "
        :class="{
          'top-16 sm:top-2': !showControls && (!connected && !connecting),
          'top-3': !showControls && !(!connected && !connecting),
          'top-16': showControls,
        }"
    >
      <WebSocketState
          :connecting="connecting"
          :connected="connected"
          :percentLoaded="percentLoaded"
          @reconnect="startWebSocket"
      />
    </div>
    <div
        class="absolute top-0 left-0 p-4 select-none pointer-events-none"
    >
      <RoundButton
          @click="showControls = !showControls"
          :img-src="showControls ? closeImage : menuImage"
          :label="showControls ? 'Hide menu' : 'Show menu'"
      />
    </div>
    <div
        class="absolute top-0 w-full overflow-hidden select-none pointer-events-none"
        style="height: calc(4rem + env(safe-area-inset-top))"
    >
      <div
          class="
            w-full h-full
            p-4
            transition-all ease-in-out duration-300
            pointer-events-none
            flex justify-between gap-2 sm:gap-4 sm:space-x-2
          "
          :style="{
            'transform': !showControls ? 'translate(0, calc(-4rem - env(safe-area-inset-top)))' : 'translate(0, 0)',
          }"
      >
        <div class="w-8"></div>
        <IncrementerButtons
            left-label="Rotate anti-clockwise"
            right-label="Rotate clockwise"
            :disabled="!showControls"
            :left-img-src="rotateAntiClockwiseImage"
            :right-img-src="rotateClockwiseImage"
            @updateDirection="updateRotateDirection"
        />
        <IncrementerButtons
            left-label="Zoom out"
            right-label="Zoom in"
            :disabled="!showControls"
            :left-img-src="zoomOutImage"
            :right-img-src="zoomInImage"
            @updateDirection="updateZoomDirection"
        />
        <RoundButton
            label="Information"
            :disabled="!showControls"
            :img-src="infoImage"
            @click="showControls = !showControls"
        />
      </div>
    </div>
    <div
        class="absolute bottom-0 p-4 select-none pointer-events-none overflow-hidden"
        style="height: calc(12rem + env(safe-area-inset-bottom))"
    >
      <RoundButton
          @click="selectPosition(null)"
          label="Close color selection"
          class="transition-all ease-in-out duration-300 transform"
          :disabled="selectedPosition === null"
          :img-src="closeImage"
          :style="{
            'transform': selectedPosition === null ? 'translate(0, calc(12rem + env(safe-area-inset-bottom)))' : 'translate(0, 0)',
          }"
      />
    </div>
    <div
        class="absolute bottom-0 w-full overflow-hidden pointer-events-none"
        style="height: calc(8rem + env(safe-area-inset-bottom))"
    >
      <div
          class="
            w-full h-full
            bg-neutral-800/70 text-neutral-200 backdrop-blur-md
            transition-all ease-in-out duration-300
            pointer-events-auto
          "
          :style="{
            'transform': selectedPosition === null ? 'translate(0, calc(8rem + env(safe-area-inset-bottom)))' : 'translate(0, 0)',
          }"
      >
        <ColorSelector
            :disabled="selectedPosition === null"
            @select-color-id="updateColorId"
        />
      </div>
    </div>
  </div>
  <Info />
</template>
