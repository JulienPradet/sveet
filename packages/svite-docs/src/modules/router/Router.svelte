<script>
  import routes from "../../../.svite/routes";
  import { makeRouterStore } from "./store";

  export let initialPage;

  let { route } = makeRouterStore(initialPage);
</script>

{#if !$route}
  <div>Not found.</div>
{:else if $route.resolvedComponent}
  <svelte:component this={$route.resolvedComponent.default} />
{:else}
  {#await $route.component()}
    <div>Loading...</div>
  {:then component}
    <svelte:component this={component.default} />
  {/await}
{/if}
