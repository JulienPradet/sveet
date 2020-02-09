import App from "./App.svelte";
import { preload } from "./src/router";
import { WebStaticClient, setGlobalStaticClient } from "sveet/query";

export default routes => {
  const initialPage = {
    pathname: window.location.pathname,
    state: window.history.state
  };

  const staticClient = new WebStaticClient();
  setGlobalStaticClient(staticClient);

  preload(routes, staticClient, initialPage).then(() => {
    new App({
      target: document.getElementById("sveet"),
      hydrate: true,
      props: {
        routes: routes,
        initialPage: initialPage,
        staticClient: staticClient
      }
    });
  });
};
