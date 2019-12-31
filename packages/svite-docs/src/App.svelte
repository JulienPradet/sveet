<script>
  import { setStaticClient } from "svite-graphql/dist/context";
  import routes from "../.svite/routes";
  import page from "./modules/router";

  $: route = routes.find(route => {
    console.log(route.path === $page.pathname);
    return route.path === $page.pathname;
  });

  setStaticClient();
</script>

{#await route.component()}
  <div>Loading...</div>
{:then component}
  <svelte:component this={component} />
{/await}
