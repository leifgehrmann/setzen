<template>
  <p class="text-sm">Effective 18th May 2022.</p>
  <h3>Data Controllers</h3>
  <p>This application has three controllers who control data collected from you by using this website.</p>
  <ul>
    <li><a href="https://github.com/leifgehrmann">Leif Gehrmann</a>, administrator of setzen.fun.</li>
    <li>GitHub, Inc.</li>
    <li>Amazon Web Services, Inc.</li>
  </ul>
  <section>
    <h3>What setzen.fun collects</h3>
    <details>
      <summary>Tile updates</summary>
      <p>When a tile's color is updated, the tile's location, tile's color, the timestamp of the update, and your Connection Identifier (defined below) is stored indefinitely in a database hosted on Amazon Web Services. This data is shared with anyone who accesses setzen.fun to keep the globe up to date.</p>
      <p>The Connection Identifier is a random identifier which generated after pressing 'Connect', representing your web-socket connection. This identifier is used for tracking connections, tracking tile updates, and may be used to revert any rule-breaking behaviour. Reloading the page or renewing a session will generate a new identifier.</p>
    </details>
    <details>
      <summary>IP addresses</summary>
      <p>When a tile's color is updated, setzen.fun logs your IP address. The logs are stored on Amazon Web Services and are automatically deleted after 1 week.</p>
      <p>This data is used to monitor and mitigate rule-breaking behaviour.</p>
    </details>
    <details>
      <summary>Network request types</summary>
      <p>After pressing 'Connect', setzen.fun logs the 'type' of network requests from your browser. The logs are stored on Amazon Web Services and are automatically deleted after 1 week. There are two categories of network request types: Requests that return the current state of the globe, and requests that update the globe's state.</p>
      <p>This data is used to monitor and mitigate rule-breaking behaviour.</p>
    </details>
  </section>
  <section>
    <h3>What other services collect</h3>
    <details>
      <summary>GitHub, Inc.</summary>
      <p>Setzen.fun is hosted on GitHub Pages, a service provided by GitHub Inc. which have <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement#github-pages">their own privacy policy</a>.</p>
    </details>
    <details>
      <summary>Amazon Web Services, Inc.</summary>
      <p>Setzen.fun uses Amazon API Gateway, a service provided by Amazon Web Services Inc. which have <a href="https://aws.amazon.com/privacy/">their own privacy policy</a>.</p>
    </details>
  </section>
</template>

<script setup lang="ts">
</script>

<style scoped>
details {
  @apply bg-purple-900;
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
