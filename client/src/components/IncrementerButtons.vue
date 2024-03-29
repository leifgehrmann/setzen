<template>
  <div class="text-neutral-200 backdrop-blur-md grow sm:grow-0 sm:w-40 h-8 rounded-full pointer-events-auto">
    <button
      type="button"
      ref="leftButton"
      class="bg-neutral-800/70 w-1/2 h-full rounded-l-full"
      :disabled="disabled"
      :aria-label="rightLabel"
      :class="{ 'bg-neutral-700/70': direction === -1 }"
      @mousedown="decrement()"
      @mouseup="release()"
      @mouseleave="release()"
      @focusout="release()"
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
      type="button"
      ref="rightButton"
      class="bg-neutral-800/70 w-1/2 h-full rounded-r-full"
      style="box-shadow: -1px 0 0 0 rgba(255, 255, 255, 0.15)"
      :disabled="disabled"
      :aria-label="rightLabel"
      :class="{ 'bg-neutral-700/70': direction === 1 }"
      @mousedown="increment()"
      @mouseup="release()"
      @mouseleave="release()"
      @focusout="release()"
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
import { ref, onMounted } from 'vue';

defineProps({
  leftLabel: {
    type: String,
    required: true,
  },
  leftImgSrc: {
    type: String,
    required: true,
  },
  rightLabel: {
    type: String,
    required: true,
  },
  rightImgSrc: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['updateDirection']);

const direction = ref(0);

const leftButton = ref<HTMLButtonElement | null>(null);
const rightButton = ref<HTMLButtonElement | null>(null);

function updateDirection(newDirection: number) {
  if (direction.value === newDirection) {
    return;
  }
  direction.value = newDirection;
  emit('updateDirection', direction.value);
}

function decrement() {
  updateDirection(-1);
}

function increment() {
  updateDirection(1);
}

function release() {
  updateDirection(0);
}

onMounted(() => {
  const leftButtonElement = leftButton.value;
  const rightButtonElement = rightButton.value;
  if (leftButtonElement === null || rightButtonElement === null) {
    return;
  }
  leftButtonElement.addEventListener('touchstart', decrement);
  leftButtonElement.addEventListener('touchcancel', release);
  leftButtonElement.addEventListener('touchend', release);
  rightButtonElement.addEventListener('touchstart', increment);
  rightButtonElement.addEventListener('touchcancel', release);
  rightButtonElement.addEventListener('touchend', release);
});
</script>

<style scoped>

</style>
