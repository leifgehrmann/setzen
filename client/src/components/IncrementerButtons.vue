<template>
  <div class="text-neutral-200 backdrop-blur-md grow sm:grow-0 sm:w-40 h-8 rounded-full pointer-events-auto">
    <button
        class="bg-neutral-800/70 w-1/2 h-full rounded-l-full"
        :aria-label="rightLabel"
        :class="{'bg-neutral-700/70': leftActive}"
        @mousedown="leftActive = true"
        @mouseup="leftActive = false"
        @mouseleave="leftActive = false"
    >
      <img
          aria-hidden="false"
          class="w-full h-full p-2 select-none pointer-events-none"
          style="-webkit-user-drag: none;"
          :src="leftImgSrc"
          :alt="leftLabel"
      >
    </button>
    <button
        class="bg-neutral-800/70 w-1/2 h-full rounded-r-full"
        style="box-shadow: -1px 0 0 0 rgba(255, 255, 255, 0.15)"
        :aria-label="rightLabel"
        :class="{'bg-neutral-700/70': rightActive}"
        @mousedown="rightActive = true"
        @mouseup="rightActive = false"
        @mouseleave="rightActive = false"
    >
      <img
          aria-hidden="false"
          class="w-full h-full p-2 select-none pointer-events-none"
          style="-webkit-user-drag: none;"
          :src="rightImgSrc"
          :alt="rightLabel"
      >
    </button>
  </div>
</template>

<script setup>
import { ref } from "vue";

defineProps({
  leftLabel: String,
  leftImgSrc: String,
  rightLabel: String,
  rightImgSrc: String,
})

const leftActive = ref(false)
const rightActive = ref(false)
</script>

<style scoped>

</style>
