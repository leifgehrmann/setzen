<template>
  <div
      class="
        absolute top-0 w-full
        bg-neutral-800/20 backdrop-blur-md
      ">
    <div
        class="
          sm:max-w-lg mx-auto sm:my-6
          bg-neutral-800/90 text-neutral-200 backdrop-blur-md
          sm:rounded-2xl
          bg-clip-content
        "
    >
      <img src="../assets/title.png" alt="SETZEN" class="sm:rounded-2xl">
      <div class="px-5">
        <p>Welcome! 𝐒𝐄𝐓𝐙𝐄𝐍 is a multiplayer collaborative canvas where you place tiles on a globe consisting of a million 'trixels'. It is a remix of Reddit’s <a class="underline text-blue-300" href="https://en.wikipedia.org/wiki/R/place">April Fools experiment r/place</a>.</p>

        <p><strong>How to play:</strong> No registration is needed, simply connect! Once the globe has loaded, touch any part of the surface to focus on a tile. A color selector will appear which allows you to change the color.</p>
        <div class="py-1"></div>
        <button class="mx-auto px-4 py-1 bg-green-600/70 cursor-pointer pointer-events-auto rounded">Connect</button>
        <div class="py-3"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>

</style>
