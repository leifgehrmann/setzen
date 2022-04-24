<script setup lang="ts">
import './index.css'
import Globe from './components/Globe.vue'
import ColorSelector from "./components/ColorSelector.vue";

import { initState, update, updateBulk } from './utils/state';

import { ref, onMounted } from 'vue'
import {initWebSocket, synchronise, requestUpdate} from "./utils/webSocket";

let sphereDetail = 224
let sphereFaceCount = 20 * (sphereDetail + 1) * (sphereDetail + 1)
let chunkSize = 16875 // See /server/sendmessage/app.js

let loaded = ref(false)
let connected = ref(false)
let selectedPosition = ref(null as number|null)

initState(sphereFaceCount, chunkSize)

function selectPosition(position: number|null) {
  selectedPosition.value = position
}

function updateColorId(colorId: number) {
  const position = selectedPosition.value
  if (position !== null) {
    console.log('updateColorId', position, colorId)
    update(position, colorId)
    requestUpdate(position, colorId)
  }
}

onMounted(() => {
  const newColorIds = new Uint8Array(sphereFaceCount)
  updateBulk(0, newColorIds, Date.now())

  initWebSocket(() => {
    synchronise(1)
  })
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
      v-if="selectedPosition !== null"
      class="absolute bottom-0 w-full"
  >
    <div class="bg-neutral-800/70 w-full text-neutral-200 backdrop-blur-md">
      <span @click="selectPosition(null)">close</span>
<!--      <div id="rotate">Rotate</div>-->
      <ColorSelector @select-color-id="updateColorId"/>
    </div>
  </div>
</div>
</template>
