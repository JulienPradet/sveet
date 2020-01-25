<script>
  import { setStaticClient } from "svite/graphql";
  import Router from "./modules/router/Router.svelte";

  export let initialPage;
  export let staticClient;
  export let preloads = [];

  setStaticClient(staticClient);
</script>

<style>
  :global(body) {
    color: red;
  }
</style>

<svelte:head>
  {#each preloads as preload}
    <link rel="preload" href={preload.href} as={preload.as} crossorigin />
  {/each}
</svelte:head>

<Router {initialPage} />
