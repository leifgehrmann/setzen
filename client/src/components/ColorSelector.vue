<template>
  <div class="overflow-scroll py-4 relative">
    <svg class="h-16 px-4" :viewBox="`0 0 ${colors.length*50+50} ${86.6}`">
      <g v-for="(color, index) in colors">
        <polygon :points="points(index)" :fill="color" class="cursor-pointer pointer-events-auto" @click="log(index)"/>
      </g>
    </svg>

    <!--<input v-for="(color, index) in colors"
           :value="index"
           v-model="selectedIndex"
           name="color"
           type="radio"
           class="absolute"
           :style="{
              width: '20px',
              top: index % 2 === 0 ? `calc(50% + 5px)` : `calc(50% - 15px)`,
              left: `calc(${index * 2.31 + 3.3}rem - 10px)`
           }"
    >-->
  </div>
<!--    <svg v-if="!up" class="h-10 absolute" viewBox="0 0 100 86.6"><polygon points="0,86.6 100,86.6 50,0" fill="#FFFFFF" @click="log" class="cursor-pointer pointer-events-auto"/></svg>-->
<!--    <button v-if="up" class="rounded-lg bg-red-200 h-3 w-3 inset-full absolute"></button>-->
<!--    <button v-if="data" class="rounded-lg bg-red-200 h-3 w-3 inset-full absolute"></button>-->

</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps({
  up: Boolean
});

let selectedIndex = ref(0)

const colors = [
  '#6d001a',
  '#be0039',
  '#ff4500',
  '#ffa800',
  '#ffd635',
  '#fff8b8',
  '#00a368',
  '#00cc78',
  '#7eed56',
  '#00756f',
  '#009eaa',
  '#00ccc0',
  '#2450a4',
  '#3690ea',
  '#51e9f4',
  '#493ac1',
  '#6a5cff',
  '#94b3ff',
  '#811e9f',
  '#b44ac0',
  '#e4abff',
  '#de107f',
  '#ff3881',
  '#ff99aa',
  '#6d482f',
  '#9c6926',
  '#ffb470',
  '#000000',
  '#515252',
  '#898d90',
  '#d4d7d9',
  '#ffffff'
]

















function points(index: number): string {
  let lx = index * 50
  let mx = index * 50 + 50
  let rx = index * 50 + 100
  let ty = 0
  let by = 86.6
  if (index % 2 == 0) {
    ty = 86.6
    by = 0
  }
  return `${lx},${ty} ${mx},${by} ${rx},${ty}`
}

function log(index: number) {
  selectedIndex = ref(index)
  console.log(index)
}
</script>

<style scoped>

</style>
