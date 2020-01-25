<script>
  import { setStaticClient } from "svite/graphql";
  import Router from "./modules/router/Router.svelte";

  export let initialPage;
  export let staticClient;

  setStaticClient(staticClient);
</script>

<Router {initialPage} />
