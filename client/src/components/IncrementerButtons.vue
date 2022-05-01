<template>
  <div class="text-neutral-200 backdrop-blur-md grow sm:grow-0 sm:w-40 h-8 rounded-full pointer-events-auto">
    <button
        ref="leftButton"
        class="bg-neutral-800/70 w-1/2 h-full rounded-l-full"
        :aria-label="rightLabel"
        :class="{'bg-neutral-700/70': direction === -1}"
        @mousedown="decrement()"
        @mouseup="release()"
        @mouseleave="release()"
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
        ref="rightButton"
        class="bg-neutral-800/70 w-1/2 h-full rounded-r-full"
        style="box-shadow: -1px 0 0 0 rgba(255, 255, 255, 0.15)"
        :aria-label="rightLabel"
        :class="{'bg-neutral-700/70': direction === 1}"
        @mousedown="increment()"
        @mouseup="release()"
        @mouseleave="release()"
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

<script setup lang="ts">
import { ref, onMounted } from "vue";

defineProps({
  leftLabel: String,
  leftImgSrc: String,
  rightLabel: String,
  rightImgSrc: String,
})

const emit = defineEmits(['updateDirection'])

const direction = ref(0)

const leftButton = ref(null)
const rightButton = ref(null)

function updateDirection(newDirection: number) {
  if (direction.value === newDirection) {
    return
  }
  direction.value = newDirection
  emit('updateDirection', direction.value)
}

function decrement() {
  updateDirection(-1)
}

function increment() {
  updateDirection(1)
}

function release() {
  updateDirection(0)
}

onMounted(() => {
  const leftButtonElement = leftButton.value as HTMLButtonElement
  const rightButtonElement = rightButton.value as HTMLButtonElement
  leftButtonElement.addEventListener('touchstart', decrement)
  leftButtonElement.addEventListener('touchcancel', release)
  leftButtonElement.addEventListener('touchend', release)
  rightButtonElement.addEventListener('touchstart', increment)
  rightButtonElement.addEventListener('touchcancel', release)
  rightButtonElement.addEventListener('touchend', release)
})
</script>

<style scoped>

</style>
