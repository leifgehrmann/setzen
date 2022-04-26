<template>
  <span v-if="!connected">
    <span class="pr-4">Session disconnected</span>
    <button class="px-2 py-1 bg-red-900 cursor-pointer pointer-events-auto rounded-md" @click="emit('retry')">Retry</button>
  </span>
  <span v-else-if="percentLoaded !== 100">Loading ({{Math.floor(percentLoaded)}}%)</span>
</template>

<script setup lang="ts">

defineProps({
  connected: Boolean,
  percentLoaded: Number,
})

const emit = defineEmits(['retry'])

</script>

<style scoped>

</style>
