<script setup lang="ts">
import './index.css'
import Globe from './components/Globe.vue'
import ColorSelector from "./components/ColorSelector.vue";
import WebSocketState from "./components/WebSocketState.vue";
import { ref, onMounted } from 'vue'
import { initState, update, updateRange } from './utils/state';
import { initWebSocket, synchronise, requestUpdate } from "./utils/webSocket";

let sphereDetail = 224
let sphereFaceCount = 20 * (sphereDetail + 1) * (sphereDetail + 1)
let chunkSize = 16875 // See /server/sendmessage/app.js

let percentLoaded = ref(0)
let connected = ref(false)
let selectedPosition = ref(null as number|null)

initState(sphereFaceCount, chunkSize)

function selectPosition(position: number|null) {
  selectedPosition.value = position
}

function updateColorId(colorId: number) {
  const position = selectedPosition.value
  if (!connected.value) {
    console.error('Cannot send update while disconnected.')
    return
  }
  if (position !== null) {
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
}

function startWebSocket() {
  initWebSocket(() => {
    synchronise((newPercentLoaded) => {
      percentLoaded.value = newPercentLoaded
    })
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
      v-if="!connected || percentLoaded < 100"
      class="absolute top-8 inset-x-0 text-center pointer-events-none cursor-default"
  >
    <span class="pl-4 pr-2 py-4 bg-neutral-800/70 w-full text-neutral-200 backdrop-blur-md rounded-lg">
      <WebSocketState :percentLoaded="percentLoaded" :connected="connected" @retry="startWebSocket"/>
    </span>
  </div>
  <div
      v-if="selectedPosition !== null"
      class="absolute bottom-28 p-4 select-none pointer-events-none"
  >
    <button
        @click="selectPosition(null)"
        class="px-4 py-2 bg-neutral-800/70 text-neutral-200 backdrop-blur-md rounded-lg text-center pointer-events-auto">
      X
    </button>
  </div>
  <div
      v-if="selectedPosition !== null"
      class="absolute bottom-0 w-full"
  >
    <div class="bg-neutral-800/70 w-full text-neutral-200 backdrop-blur-md">
      <ColorSelector @select-color-id="updateColorId"/>
    </div>
  </div>
</div>
</template>
