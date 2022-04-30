<script setup lang="ts">
import './index.css'
import Globe from './components/Globe.vue'
import ColorSelector from "./components/ColorSelector.vue";
import WebSocketState from "./components/WebSocketState.vue";
import { ref, onMounted } from 'vue'
import {
  initState,
  updateRange,
  getStateColorId,
  loadFromLocalStorage,
  addUpdateBulkListener,
  persistToLocalStorage,
  addUpdateListener, provisionalUpdate, triggerBulkUpdate
} from './utils/state';
import { initWebSocket, synchronise, requestUpdate } from "./utils/webSocket";

let sphereDetail = 224
let sphereFaceCount = 20 * (sphereDetail + 1) * (sphereDetail + 1)
let chunkSize = 16875 // See /server/sendmessage/app.js

let showControls = ref(false)
let rotatingClockwise = ref(false)
let rotatingAntiClockwise = ref(false)
let zoomingIn = ref(false)
let zoomingOut = ref(false)
let percentLoaded = ref(0)
let connecting = ref(false)
let connected = ref(false)
let selectedPosition = ref(null as number|null)

initState(sphereFaceCount, chunkSize)
loadFromLocalStorage()
addUpdateBulkListener(() => { persistToLocalStorage() })
addUpdateListener(() => { persistToLocalStorage() })
triggerBulkUpdate()

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
})

</script>

<template>
  <div class="relative">
  <Globe
      :sphere-detail="sphereDetail"
      :selected-position="selectedPosition"
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
      class="absolute top-0 right-0 p-4 select-none pointer-events-none"
  >
    <button
        @click="showControls = !showControls"
        class="w-8 h-8 bg-neutral-800/70 backdrop-blur-md rounded-full pointer-events-auto"
    >
      <img
          v-if="!showControls"
          src="./assets/menu.svg"
          class="w-full h-full p-2 select-none pointer-events-none"
          alt="Show menu"
          style="-webkit-user-drag: none; user-drag: none;"
      >
      <img
          v-if="showControls"
          src="./assets/close.svg"
          class="w-full h-full p-2 select-none pointer-events-none"
          alt="Hide menu"
          style="-webkit-user-drag: none; user-drag: none;"
      >
    </button>
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
      <button class="bg-neutral-800/70 backdrop-blur-md w-8 h-8 rounded-full select-none pointer-events-auto">
          <img
              src="./assets/info.svg"
              class="w-full h-full p-2 select-none pointer-events-none"
              alt="Information"
              style="-webkit-user-drag: none; user-drag: none;"
          >
      </button>
      <div class="text-neutral-200 backdrop-blur-md grow sm:grow-0 sm:w-40 h-8 rounded-full pointer-events-auto">
        <button
            class="bg-neutral-800/70 w-1/2 h-full rounded-l-full"
            :class="{'bg-neutral-700/70': rotatingAntiClockwise}"
            @mousedown="rotatingAntiClockwise = true"
            @mouseup="rotatingAntiClockwise = false"
            @mouseleave="rotatingAntiClockwise = false"
        >
          <img
              src="./assets/rotate-anti-clockwise.svg"
              class="w-full h-full p-2 select-none pointer-events-none"
              alt="Rotate anti-clockwise"
              style="-webkit-user-drag: none; user-drag: none;"
          >
        </button>
        <button
            class="bg-neutral-800/70 w-1/2 h-full rounded-r-full"
            style="box-shadow: -1px 0 0 0 rgba(255, 255, 255, 0.15)"
            :class="{'bg-neutral-700/70': rotatingClockwise}"
            @mousedown="rotatingClockwise = true"
            @mouseup="rotatingClockwise = false"
            @mouseleave="rotatingClockwise = false"
        >
          <img
              src="./assets/rotate-clockwise.svg"
              class="w-full h-full p-2 select-none pointer-events-none"
              alt="Rotate clockwise"
              style="-webkit-user-drag: none; user-drag: none;"
          >
        </button>
      </div>
      <div class="text-neutral-200 backdrop-blur-md grow sm:grow-0 sm:w-40 h-8 rounded-full pointer-events-auto">
        <button
            class="bg-neutral-800/70 w-1/2 h-full rounded-l-full"
            :class="{'bg-neutral-700/70': zoomingOut}"
            @mousedown="zoomingOut = true"
            @mouseup="zoomingOut = false"
            @mouseleave="zoomingOut = false"
        >
          <img
              src="./assets/zoom-out.svg"
              class="w-full h-full p-2 select-none pointer-events-none"
              alt="Zoom out"
              style="-webkit-user-drag: none; user-drag: none;"
          >
        </button>
        <button
            class="bg-neutral-800/70 w-1/2 h-8 rounded-r-full"
            style="box-shadow: -1px 0 0 0 rgba(255, 255, 255, 0.15)"
            :class="{'bg-neutral-700/70': zoomingIn}"
            @mousedown="zoomingIn = true"
            @mouseup="zoomingIn = false"
            @mouseleave="zoomingIn = false"
        >
          <img
              src="./assets/zoom-in.svg"
              class="w-full h-full p-2 select-none pointer-events-none"
              alt="Zoom in"
              style="-webkit-user-drag: none; user-drag: none;"
          >
        </button>
      </div>
      <div class="w-8"></div>
    </div>
  </div>
  <div
      class="absolute bottom-0 h-44 p-4 select-none pointer-events-none overflow-hidden"
      style="height: calc(11rem + env(safe-area-inset-bottom))"
  >
    <button
        @click="selectPosition(null)"
        class="
          w-8 h-8
          bg-neutral-800/70 text-neutral-200 backdrop-blur-md
          rounded-full
          text-center
          pointer-events-auto
          transition-all ease-in-out duration-300 transform"
        :disabled="selectedPosition === null"
        :style="{
          'transform': selectedPosition === null ? 'translate(0, calc(10rem + env(safe-area-inset-bottom)))' : 'translate(0, 0)',
        }"
    >
      <img
          src="./assets/close.svg"
          class="w-full h-full p-2 select-none pointer-events-none"
          alt="Close"
          style="-webkit-user-drag: none; user-drag: none;"
      >
    </button>
  </div>
  <div
      class="absolute bottom-0 w-full overflow-hidden pointer-events-none"
      style="height: calc(7rem + env(safe-area-inset-bottom))"
  >
    <div
        class="
          w-full h-full
          bg-neutral-800/70 text-neutral-200 backdrop-blur-md
          transition-all ease-in-out duration-300
          pointer-events-auto
        "
        :style="{
          'transform': selectedPosition === null ? 'translate(0, calc(7rem + env(safe-area-inset-bottom)))' : 'translate(0, 0)',
        }"
    >
      <ColorSelector @select-color-id="updateColorId"/>
    </div>
  </div>
</div>
</template>
