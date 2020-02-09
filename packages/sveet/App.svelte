<script>
  import { onMount } from "svelte";
  import { listenNavigation, makeRouterStores } from "./router";
  import { setStaticClient } from "./query";

  export let staticClient;
  export let initialPage;
  export let routes;

  setStaticClient(staticClient);

  let { route, page, location } = makeRouterStores(routes, initialPage);
  $: props = $route.path.exec($page.pathname).groups;
</script>

{#if !$route}
  <div>Not found.</div>
{:else if $route.resolvedComponent}
  <svelte:component
    this={$route.resolvedComponent.default}
    location={$location} />
{:else}
  {#await $route.component()}
    <div>Loading...</div>
  {:then component}
    <svelte:component this={component.default} location={$location} />
  {/await}
{/if}
