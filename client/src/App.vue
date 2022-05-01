<script setup lang="ts">
import './index.css'
import closeImage from './assets/close.svg'
import menuImage from './assets/menu.svg'
import infoImage from './assets/info.svg'
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

let sphereDetail = 224
let sphereFaceCount = 20 * (sphereDetail + 1) * (sphereDetail + 1)
let chunkSize = 16875 // See /server/sendmessage/app.js

let showControls = ref(false)
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
        <RoundButton
            @click="showControls = !showControls"
            label="Information"
            :img-src="infoImage"
        />
        <IncrementerButtons
            left-label="Rotate anti-clockwise"
            right-label="Rotate clockwise"
            :left-img-src="rotateAntiClockwiseImage"
            :right-img-src="rotateClockwiseImage"
        />
        <IncrementerButtons
            left-label="Zoom out"
            right-label="Zoom in"
            :left-img-src="zoomOutImage"
            :right-img-src="zoomInImage"
        />
        <div class="w-8"></div>
      </div>
    </div>
    <div
        class="absolute bottom-0 h-44 p-4 select-none pointer-events-none overflow-hidden"
        style="height: calc(11rem + env(safe-area-inset-bottom))"
    >
      <RoundButton
          @click="selectPosition(null)"
          label="Close color selection"
          class="transition-all ease-in-out duration-300 transform"
          :img-src="closeImage"
          :style="{
            'transform': selectedPosition === null ? 'translate(0, calc(10rem + env(safe-area-inset-bottom)))' : 'translate(0, 0)',
          }"
      />
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
