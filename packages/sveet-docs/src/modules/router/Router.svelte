<script>
  import { makeRouterStores } from "./routerStores";

  export let initialPage;

  let { route, page, location } = makeRouterStores(initialPage);
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
