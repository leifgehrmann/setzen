<script setup lang="ts">
import './index.css'
import Globe from './components/Globe.vue'
import ColorSelector from "./components/ColorSelector.vue";
</script>

<template>
  <div class="relative">
  <Globe/>
  <div class="absolute bottom-0 w-full">
    <div class="bg-neutral-800/70 w-full text-neutral-200 backdrop-blur-md">
<!--      <div id="rotate">Rotate</div>-->
      <ColorSelector />
    </div>
  </div>
</div>
</template>
