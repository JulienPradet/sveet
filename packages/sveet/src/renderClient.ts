import { preload } from "./router/router";
import { WebStaticClient, setGlobalStaticClient } from "./query/query";
import { Route } from "./router/routerTypes";

export default (App: any) => (routes: Route[]) => {
  const initialPage = {
    pathname: window.location.pathname,
    state: window.history.state,
    search: ""
  };

  const staticClient = new WebStaticClient();
  setGlobalStaticClient(staticClient);

  preload(routes, initialPage).then(() => {
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
