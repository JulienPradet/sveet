<script>
  import routes from "../../../.svite/routes";
  import { makeRouterStore } from "./store";

  export let initialPage;

  let { route } = makeRouterStore(initialPage);
</script>

{#await $route.component()}
  <div>Loading...</div>
{:then component}
  <svelte:component this={component} />
{/await}
