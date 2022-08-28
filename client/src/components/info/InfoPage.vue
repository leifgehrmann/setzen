<template>
  <div
    class="
      absolute top-0 w-full
      bg-black/80 backdrop-blur-md
    "
  >
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
      <div class="intro px-5 bg-neutral-800/50">
        <div class="py-2" />
        <p>Welcome! 𝐒𝐄𝐓𝐙𝐄𝐍 is a multiplayer collaborative canvas where you place tiles on a globe consisting of a million 'trixels'. It is a remix of Reddit’s <a class="underline text-blue-300" href="https://en.wikipedia.org/wiki/R/place">April Fools experiment r/place</a>.</p>
        <div class="py-2" />
        <div class="w-full text-center text-xs">
          <p><a href="#terms-of-use">Terms of Use</a> · <a href="#privacy-policy">Privacy Policy</a><br><span class="whitespace-nowrap">Last Updated: {{policyDateString}}</span></p>
          <div class="py-1" />
          <button
            type="button"
            class="mx-auto text-2xl px-10 py-1 bg-green-600/70 hover:bg-green-500/70 cursor-pointer pointer-events-auto rounded-full"
            @click="emit('connect')"
          >
            Enter
          </button>
        </div>
        <div class="py-7" />
      </div>
      <div class="px-5 py-5 bg-blue-800/50">
        <h2 class="text-blue-300">Controls</h2>
        <ControlsSection />
      </div>
      <div class="px-5 py-5 bg-red-800/50">
        <h2 class="text-red-300">Rules</h2>
        <RulesSection />
      </div>
      <div class="px-5 py-5 bg-green-800/50">

        <h2 class="text-green-300">FAQ</h2>
        <FaqSection />

      </div>
      <!-- eslint-disable-next-line vuejs-accessibility/anchor-has-content -->
      <a id="terms-of-use" />
      <div class="px-5 py-5 bg-yellow-800/50">
        <h2 class="text-yellow-300">Terms of Use</h2>
        <TermsOfUse />
      </div>
      <!-- eslint-disable-next-line vuejs-accessibility/anchor-has-content -->
      <a id="privacy-policy" />
      <div class="px-5 py-5 bg-purple-800/50 sm:rounded-b-2xl">
        <h2 class="text-purple-300">Privacy Policy</h2>
        <PrivacyPolicy />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PrivacyPolicy from './PrivacyPolicy.vue';
import ControlsSection from './ControlsSection.vue';
import RulesSection from './RulesSection.vue';
import FaqSection from './FaqSection.vue';
import TermsOfUse from './TermsOfUse.vue';
import { getPolicyDateString } from '../../utils/policyCheck';

const policyDateString = ref(getPolicyDateString());

const emit = defineEmits(['connect']);
</script>

<style>
p {
  @apply pb-4;
  @apply text-neutral-200;
}

a {
  @apply underline;
  @apply text-blue-300;
  @apply hover:text-blue-200;
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

.intro {
  background-image: url("../../assets/subtitle.png");
  background-position: bottom center;
  background-size: contain;
  background-repeat: no-repeat;
}
</style>
