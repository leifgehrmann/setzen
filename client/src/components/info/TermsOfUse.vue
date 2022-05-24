<template>
  <p>Effective {{policyDateString}}.</p>
  <p>
    By pressing 'Enter' you agree to the following terms of use:
  </p>
  <ul class="text-sm">
    <li>You agree to license your contributions (Specifically, tile updates to the globe) under the <a href="https://creativecommons.org/publicdomain/zero/1.0/">Creative Commons Zero License</a> and for {{webAppHostCapitalized}} to store and display them.</li>
    <li>Your use of the website must not violate any applicable laws, including copyright laws.</li>
    <li>You are solely responsible for the user-generated content that you contribute.</li>
    <li>{{webAppHostCapitalized}} reserves the right to refuse or remove any user-generated content that, in our sole discretion, violates our rules or any laws.</li>
    <li>{{webAppHostCapitalized}} reserves the right to amend these terms at any time. When that happens, the terms on this website will be updated and visitors of this website will be prompted to accept the terms via the 'Enter' button.</li>
    <li>You agree to the privacy policy.</li>
    <li>Deletion requests of personal information and reports of copyright violations can be sent to the <a :href="`mailto:${email}`">administrator via e-mail</a>.</li>
  </ul>
</template>

<script setup lang="ts">
import {ref} from "vue";
import {getPolicyDateString} from "../../utils/policyCheck";
import {getWebAppHost, getContactEmail} from "../../utils/definedVars";

const webAppHostCapitalized = ref(getWebAppHost().charAt(0).toUpperCase() + getWebAppHost().slice(1))
const policyDateString = ref(getPolicyDateString())
const email = ref(getContactEmail())
</script>

<style scoped>
</style>
