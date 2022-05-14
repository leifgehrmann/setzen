<template>
  <div class="overflow-x-scroll pt-4 h-32 relative text-center">
    <span class="inline-block">
      <div class="flex flex-row" style="padding-left: 33vw; padding-right: 33vw">
        <div
            v-for="(color, index) in colors"
            class="h-20 relative"
            style="margin-right: -1rem"
        >
          <button
              class="absolute w-10 h-10 rounded-full"
              style="left: calc(50% - 1.25rem); top: calc(50% - 1.25rem)"
              @click="select(index)"
              :disabled="disabled"
              :aria-label="labels[index]"
          />
          <svg
              class="h-20"
              :viewBox="`0 0 ${100} ${86.6}`"
          >
            <polygon
                :points="points(index)"
                :fill="color"
                class="cursor-pointer pointer-events-auto"
                @click="select(index)"
            />
          </svg>
        </div>
      </div>
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
    </span>
  </div>
<!--    <svg v-if="!up" class="h-10 absolute" viewBox="0 0 100 86.6"><polygon points="0,86.6 100,86.6 50,0" fill="#FFFFFF" @click="log" class="cursor-pointer pointer-events-auto"/></svg>-->
<!--    <button v-if="up" class="rounded-lg bg-red-200 h-3 w-3 inset-full absolute"></button>-->
<!--    <button v-if="data" class="rounded-lg bg-red-200 h-3 w-3 inset-full absolute"></button>-->

</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import {colors, getColorIdFromKeyEvent, labels} from "../utils/colors"

const props = defineProps({
  up: Boolean,
  disabled: Boolean
});

const emit = defineEmits(['selectColorId'])

function points(index: number): string {
  let lx = 0
  let mx = 50
  let rx = 100
  let ty = 0
  let by = 86.6
  if (index % 2 == 0) {
    ty = 86.6
    by = 0
  }
  return `${lx},${ty} ${mx},${by} ${rx},${ty}`
}

const select = (index: number) => {
  emit('selectColorId', index)
}

onMounted(() => {
  window.addEventListener('keypress', (event) => {
    console.log('keypress')
    if (props.disabled) {
      return
    }
    const colorId = getColorIdFromKeyEvent(event)
    if (colorId === null) {
      return
    }
    emit('selectColorId', colorId)
  })
})
</script>

<style scoped>

</style>
