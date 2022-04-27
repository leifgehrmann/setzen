<template>
  <div
      v-if="connecting || !connected || loading"
      class="py-2 bg-neutral-800/70 text-neutral-200 backdrop-blur-lg rounded-lg"
  >
    <span
        v-if="connecting"
        class="px-4"
    >Connecting...</span>
    <span
        v-else-if="!connected"
    >
      <span class="pr-4">Session disconnected</span>
      <button
          class="pr-2 py-1 bg-red-900 cursor-pointer pointer-events-auto rounded-md"
          @click="emit('reconnect')"
      >
        Retry
      </button>
    </span>
    <span
        v-else-if="loading"
        class="px-4 inline-block w-60"
    >Loading ({{Math.floor(percentLoaded)}}%)</span>
  </div>
</template>

<script setup lang="ts">

import {computed} from "vue";

const props = defineProps({
  connecting: Boolean,
  connected: Boolean,
  percentLoaded: Number,
})

const loading = computed(() => {
  return props.connected && props.percentLoaded !== 100
})

const emit = defineEmits(['reconnect'])

</script>

<style scoped>

</style>
