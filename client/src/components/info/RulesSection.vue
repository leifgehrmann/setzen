<template>
  <p>
    The purpose of 𝐒𝐄𝐓𝐙𝐄𝐍 is to collaborate and create interesting artwork.
    Collaboration may mean overwriting someone else's work, so no one should be
    surprised to see changes being made to their own work.
  </p>
  <p>
    If there are reports of NSFW content, personal information, hate speech,
    harassment, or copyright infringement, the administrator will either:
    block the offender's IP address and/or disable this site indefinitely
    until the content is removed.
  </p>
  <p>
    Reports can be submitted on the
    <a :href="issuesUrl">project’s issues page</a>
    or by contacting the <a :href="`mailto:${email}`">administrator via e-mail</a>.
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getContactIssuesUrl, getContactEmail } from '../../utils/definedVars';

const issuesUrl = ref(getContactIssuesUrl());
const email = ref(getContactEmail());
</script>

<style scoped>

</style>
