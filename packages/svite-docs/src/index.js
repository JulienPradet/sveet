import App from "./App.svelte";
import { StaticClient } from "svite/graphql";

const app = new App({
  target: document.body,
  hydrate: true,
  props: {
    initialPage: {
      pathname: window.location.pathname,
      state: window.history.state
    },
    staticClient: new StaticClient()
  }
});

export default app;
