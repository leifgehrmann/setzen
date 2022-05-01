<template>
  <button
      :aria-label="label"
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
  label: String,
  imgSrc: String
})
</script>

<style scoped>

</style>
