<template>
  <p>Effective {{policyDateString}}.</p>
  <h3>Data Controllers</h3>
  <p>
    This application has three controllers who control data collected from
    you by using this website.
  </p>
  <ul>
    <li>The <a href="https://github.com/leifgehrmann">administrator</a> of {{webAppHost}}.</li>
    <li>GitHub, Inc.</li>
    <li>Amazon Web Services, Inc.</li>
  </ul>
  <section>
    <h3>What {{webAppHost}} collects</h3>
    <details>
      <summary>Tile updates</summary>
      <p>
        When a tile's color is updated, {{webAppHost}} collects
        the tile's location, tile's color, the timestamp of the update, and
        your Connection Identifier (defined below) which is all stored
        indefinitely in a database hosted on Amazon Web Services. This data
        is shared with anyone who accesses {{webAppHost}} to keep
        the globe up to date.
      </p>
      <p>
        The Connection Identifier is a random UUID, generated after pressing
        'Enter'. This identifier is used for tracking connections, tracking
        tile updates, and may be used to revert any rule-breaking behaviour.
        Reloading the page or renewing a session will generate a new
        identifier.
      </p>
    </details>
    <details>
      <summary>IP addresses</summary>
      <p>
        When a tile's color is updated, {{webAppHost}} logs your
        IP address and stores them on Amazon Web Services.
      </p>
      <p>This data is used to monitor and mitigate rule-breaking behaviour.</p>
      <p>
        The logs are automatically deleted after 1 week. If however an IP
        address is identified as breaking the site's rules, the IP address
        may be recorded indefinitely to block their access to the site's
        core functionality.
      </p>
    </details>
    <details>
      <summary>Usage data</summary>
      <p>
        After pressing 'Enter', {{webAppHost}} logs the 'type' of
        request made from your browser and stores them on Amazon Web Services.
        This includes information like how often you fetch the latest updates,
        or how many updates your browser is making.
      </p>
      <p>
        This data is used for analytics and to monitor and mitigate
        rule-breaking behaviour.
      </p>
      <p>The logs are automatically deleted after 1 week.</p>
    </details>
  </section>
  <section>
    <h3>What other services collect</h3>
    <details>
      <summary>GitHub, Inc.</summary>
      <p>
        {{webAppHost}} is hosted on GitHub Pages, a service
        provided by GitHub Inc. which have
        <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement#github-pages">their own privacy policy</a>.
      </p>
    </details>
    <details>
      <summary>Amazon Web Services, Inc.</summary>
      <p>{{webAppHost}} uses Amazon API Gateway, a service provided
        by Amazon Web Services Inc. which have
        <a href="https://aws.amazon.com/privacy/">their own privacy policy</a>.
      </p>
    </details>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getPolicyDateString } from '../../utils/policyCheck';
import { getWebAppHost } from '../../utils/definedVars';

const webAppHost = ref(getWebAppHost());
const policyDateString = ref(getPolicyDateString());
</script>

<style scoped>
details {
  @apply bg-purple-900/80;
}

details:first-of-type {
  @apply rounded-t-lg;
}
details:last-of-type {
  @apply rounded-b-lg;
}

summary {
  @apply py-2;
  @apply pl-3;
  @apply font-bold;
  @apply cursor-pointer;
}

details > :not(summary) {
  @apply px-3;
}

li {
  @apply list-disc;
  @apply ml-3;
}
</style>
