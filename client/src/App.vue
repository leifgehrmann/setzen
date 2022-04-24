<script setup lang="ts">
import './index.css'
import Globe from './components/Globe.vue'
import ColorSelector from "./components/ColorSelector.vue";

import { colors } from './utils/colors';
import { initState, update, updateBulk } from './utils/state';

import { ref, onMounted } from 'vue'

let sphereDetail = 224
let sphereFaceCount = 20 * (sphereDetail + 1) * (sphereDetail + 1)
let chunkSize = 16875 // See /server/sendmessage/app.js

let loaded = ref(false)
let connected = ref(false)
let selectedPosition = ref(null as number|null)

initState(sphereFaceCount)

function selectPosition(position: number) {
  console.log('selectPosition', position)
  selectedPosition.value = position
}

function updateColorId(colorId: number) {
  console.log('updateColorId', selectedPosition.value, colorId)
  update(selectedPosition.value, colorId)
}

onMounted(() => {
  let seed = 1;
  function myRandom() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  const newColorIds = new Uint8Array(sphereFaceCount)
  for (let i = 0; i < sphereFaceCount; i+=1) {
    newColorIds[i] = Math.floor(myRandom() * colors.length)
  }
  updateBulk(0, newColorIds, Date.now())
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
      <div @click="selectPosition(null)">close</div>
<!--      <div id="rotate">Rotate</div>-->
      <ColorSelector @select-color-id="updateColorId"/>
    </div>
  </div>
</div>
</template>
