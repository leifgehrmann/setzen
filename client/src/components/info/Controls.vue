<template>
  <div class="flex flex-row overflow-x-auto">
    <label for="info-control-touch" class="info-control-input" :class="{'info-control-input-selected': control === 'touch'}">
      <input type="radio" id="info-control-touch" value="touch" v-model="control">
      <span>Touch</span>
    </label>
    <label for="info-control-mouse" class="info-control-input" :class="{'info-control-input-selected': control === 'mouse'}">
      <input type="radio" id="info-control-mouse" value="mouse" v-model="control">
      <span>Mouse</span>
    </label>
    <label for="info-control-keyboard" class="info-control-input" :class="{'info-control-input-selected': control === 'keyboard'}">
      <input type="radio" id="info-control-keyboard" value="keyboard" v-model="control">
      <span>Keyboard</span>
    </label>
  </div>
  <div class="p-5 bg-neutral-900 rounded-b-xl">
    <div v-if="control === 'touch'">
      <ul>
        <li>Tap to focus on a trixel to select a color.</li>
        <li>Tap and drag to pan the globe.</li>
        <li>Pinch to zoom and rotate the camera.</li>
      </ul>
    </div>
    <div v-if="control === 'mouse'">
      <ul>
        <li>Click to focus on a trixel to select a color.</li>
        <li>Click and drag to pan the globe.</li>
        <li>Scroll-wheel to zoom.</li>
      </ul>
    </div>
    <div v-if="control === 'keyboard'">
      <ul>
        <li><code>←</code> / <code>→</code> pans the globe left/right.</li>
        <li><code>↑</code> / <code>↓</code> pans the globe up/down.</li>
        <li><code>-</code> / <code>+</code> zooms the camera.</li>
        <li><code>⇧←</code> / <code>⇧→</code> rotates the camera.</li>
        <li><code>.</code> focuses on the trixel in the center of the screen.</li>
        <li><code>␛</code> dismisses the color selector.</li>
      </ul>

      <p>Once a trixel is focused, the following keys can be used to change the color.</p>

      <img src="../../assets/keyboard.png" alt="A keyboard layout with different keys displaying keys colored according to ">
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const control = ref('touch')
</script>

<style scoped>
code {
  @apply bg-neutral-600;
  @apply rounded;
  @apply px-1;
  @apply py-0.5;
  @apply text-sm;
}

.info-control-input {
  @apply flex-grow;
  @apply bg-neutral-900/30;
  @apply px-3;
  @apply py-1;
  @apply rounded-t-xl;
  @apply cursor-pointer;
  @apply whitespace-nowrap;
}

.info-control-input span {
  @apply pl-2;
}

.info-control-input-selected {
  @apply bg-neutral-900;
}
</style>
