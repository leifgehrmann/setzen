<template>
  <div
      class="
        absolute top-0 w-full
        bg-black/80 backdrop-blur-md
      ">
    <div
        class="
          sm:max-w-lg mx-auto sm:my-6
          text-neutral-200 backdrop-blur-md
          bg-clip-content
        "
    >
      <div class="bg-neutral-800/50 sm:rounded-t-2xl">
        <img src="../../assets/title.png" alt="SETZEN" class="sm:rounded-t-2xl">
      </div>
      <div class="px-5 bg-neutral-800/50">
        <p>Welcome! 𝐒𝐄𝐓𝐙𝐄𝐍 is a multiplayer collaborative canvas where you place tiles on a globe consisting of a million 'trixels'. It is a remix of Reddit’s <a class="underline text-blue-300" href="https://en.wikipedia.org/wiki/R/place">April Fools experiment r/place</a>.</p>

        <p><strong>How to play:</strong> No registration is needed, simply connect! Once the globe has loaded, touch any part of the surface to focus on a tile. A color selector will appear which allows you to change the color.</p>
        <p><a href="#terms-of-use">Terms of Use</a> · <a href="#privacy-policy">Privacy Policy</a></p>
        <div class="py-1"></div>
        <button
            class="mx-auto px-4 py-1 bg-green-600/70 cursor-pointer pointer-events-auto rounded"
            @click="emit('connect')"
        >
          <span v-if="loaded">Re-join</span>
          <span v-else>Connect</span>
        </button>
        <div class="py-3"></div>
      </div>
      <div class="px-5 py-5 bg-green-800/50">
        <h2 class="text-green-300">Controls</h2>
        <Controls />
      </div>
      <div class="px-5 py-5 bg-red-800/50">
        <h2 class="text-red-300">Rules</h2>
        <Rules />
      </div>
      <div class="px-5 py-5 bg-blue-800/50">

        <h2 class="text-blue-300">FAQ</h2>
        <Faq />

      </div>
      <a id="terms-of-use"></a>
      <div class="px-5 py-5 bg-yellow-800/50">
        <h2 class="text-yellow-300">Terms of Use</h2>
      </div>
      <a id="privacy-policy"></a>
      <div class="px-5 py-5 bg-purple-800/50 sm:rounded-b-2xl">
        <h2 class="text-purple-300">Privacy Policy</h2>
        <PrivacyPolicy />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PrivacyPolicy from "./PrivacyPolicy.vue";
import Controls from "./Controls.vue";
import Rules from "./Rules.vue";
import Faq from "./Faq.vue";

const props = defineProps({
  loaded: Boolean
})

const emit = defineEmits(['connect'])
</script>

<style>
p {
  @apply pb-4;
  @apply text-neutral-200;
}

a {
  @apply underline;
  @apply text-blue-300;
}

h2 {
  @apply pb-3;
  @apply text-xl;
  @apply font-bold;
}

h3 {
  @apply py-3;
  @apply text-lg;
  @apply font-bold;
}

ul {
  @apply list-disc;
  @apply pl-4;
}

#privacy-policy + div {
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
}
</style>
