import { preload } from "./modules/router";
import App from "./App.svelte";
import { StaticClient, setStaticClient } from "svite/graphql";

const initialPage = {
  pathname: window.location.pathname,
  state: window.history.state
};

const staticClient = new StaticClient();
setStaticClient(staticClient);

preload(initialPage).then(() => {
  new App({
    target: document.getElementById("svite"),
    hydrate: true,
    props: {
      initialPage: initialPage,
      staticClient: staticClient
    }
  });
});
