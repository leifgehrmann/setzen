<template>
  <button
    type="button"
    :aria-label="label"
    :disabled="disabled"
    class="w-8 h-8 bg-neutral-800/70 backdrop-blur-md rounded-full pointer-events-auto"
  >
    <img
      aria-hidden="true"
      class="w-full h-full p-2 select-none pointer-events-none"
      style="-webkit-user-drag: none;"
      :alt="label"
      :src="imgSrc"
    >
  </button>
</template>

<script setup lang="ts">
defineProps({
  label: {
    type: String,
    required: true,
  },
  imgSrc: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>

</style>
