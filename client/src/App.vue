<script setup lang="ts">
import './index.css'
import Globe from './components/Globe.vue'
import ColorSelector from "./components/ColorSelector.vue";
import WebSocketState from "./components/WebSocketState.vue";
import { ref, onMounted } from 'vue'
import { initState, update, updateRange, stateColorIds } from './utils/state';
import { initWebSocket, synchronise, requestUpdate } from "./utils/webSocket";

let sphereDetail = 224
let sphereFaceCount = 20 * (sphereDetail + 1) * (sphereDetail + 1)
let chunkSize = 16875 // See /server/sendmessage/app.js

let percentLoaded = ref(0)
let connecting = ref(false)
let connected = ref(false)
let selectedPosition = ref(null as number|null)

initState(sphereFaceCount, chunkSize)

function selectPosition(position: number|null) {
  selectedPosition.value = position
}

function updateColorId(colorId: number) {
  const position = selectedPosition.value
  if (position === null) {
    return
  }
  if (stateColorIds[position] === colorId) {
    // Don't send an update if the colors are the same.
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
    update(position, colorId)
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
  const newColorIds = new Uint8Array(sphereFaceCount)
  updateRange(0, newColorIds, Date.now())

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
      class="absolute top-4 flex justify-center inset-x-0 text-center pointer-events-none cursor-default"
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
        @click="selectPosition(null)"
        class="w-8 h-8 bg-neutral-800/70 text-neutral-200 backdrop-blur-md rounded-full text-center pointer-events-auto">
      ?
    </button>
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
      X
    </button>
  </div>
  <div
      class="absolute bottom-0 w-full h-28 overflow-hidden pointer-events-none"
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
