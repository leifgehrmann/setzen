<template>
  <p class="font-bold">Q. Why a sphere, and why trixels?</p>
  <p>
    I was inspired by r/place when I saw some groups drawing small pixel
    maps of countries. Since the world is a spheroid, I was curious to see
    what would happen if I took the concept from Reddit and projected it
    onto a globe.
  </p>
  <p>
    The best tessellation that has the lowest distortion for each tile is a
    <a href="https://en.wikipedia.org/wiki/Geodesic_grid">geodesic grid</a>,
    which is why the globe consists of triangles.
  </p>
  <p class="font-bold">Q. Can I host my own instance of 𝐒𝐄𝐓𝐙𝐄𝐍?</p>
  <p>
    Yes! All the code for this project is available on
    <a href="https://github.com/leifgehrmann/setzen">GitHub</a>.
    Note however that the backend code is tightly coupled with AWS services
    like the API Gateway and DynamoDB.
  </p>
</template>

<script setup lang="ts">
</script>

<style scoped>
</style>
