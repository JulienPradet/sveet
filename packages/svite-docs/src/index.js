import { preload } from "./modules/router/store";
import App from "./App.svelte";
import { StaticClient } from "svite/graphql";

const initialPage = {
  pathname: window.location.pathname,
  state: window.history.state
};

preload(initialPage).then(() => {
  new App({
    target: document.getElementById("svite"),
    hydrate: true,
    props: {
      initialPage: initialPage,
      staticClient: new StaticClient()
    }
  });
});
