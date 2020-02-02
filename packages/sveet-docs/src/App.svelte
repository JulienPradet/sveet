<script>
  import { setStaticClient } from "sveet/graphql";
  import Router from "./modules/router/Router.svelte";

  export let initialPage;
  export let staticClient;

  setStaticClient(staticClient);
</script>

<style>
  :global(body) {
    color: red;
  }
</style>

<Router {initialPage} />
