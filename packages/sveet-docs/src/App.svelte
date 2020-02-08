<script>
  import Router from "./modules/router/Router.svelte";

  export let initialPage;
</script>

<style>
  :global(body) {
    color: red;
  }
</style>

<Router {initialPage} />
