<template>
  <p class="font-bold">Q. Why a sphere, and why 'trixels'?</p>
  <p>
    During the 2022 r/place experiment some groups were drawing small
    pixel-art maps of countries. At one point during the four day
    experiment, 19 country borders of Europe coexisted on the map.
    Inspired by this aspect of the experiment, 𝐒𝐄𝐓𝐙𝐄𝐍 is a remix
    of r/place, asking what would happen if the canvas was a spheroid rather
    than a rectangular canvas. After all, the real world is a spheroid!
  </p>
  <p>
    The globe consists of triangles because the best tessellation that has
    the lowest distortion for each tile is a
    <a href="https://en.wikipedia.org/wiki/Geodesic_grid">geodesic grid</a>.
  </p>
  <p class="font-bold">Q. Can I host my own instance of 𝐒𝐄𝐓𝐙𝐄𝐍?</p>
  <p>
    Sure! All the code for this project is available on
    <a :href="projectUrl">GitHub</a>.
    Note however that the backend code is tightly coupled with AWS services
    like the API Gateway and DynamoDB.
  </p>
</template>

<script setup lang="ts">
import {ref} from "vue";

// `contactProjectUrl` is defined by vite.config.ts.
// @ts-ignore
const projectUrl = ref(contactProjectUrl)
</script>

<style scoped>
</style>
