<template>
  <span v-if="connected">Connected</span>
  <span v-if="!connected">Disconnected</span>
</template>

<script setup lang="ts">

defineProps({
  connected: Boolean
})

</script>

<style scoped>

</style>
