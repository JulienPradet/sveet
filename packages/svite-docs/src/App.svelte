<script>
  import { setStaticClient } from "svite-graphql/dist/context";
  import Router from "./modules/router/Router.svelte";

  setStaticClient();

  export let initialPage;
</script>

<Router {initialPage} />
