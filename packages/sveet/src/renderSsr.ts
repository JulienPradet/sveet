import { preload, loadAllRoutes } from "./router/router";
import { setGlobalStaticClient } from "./query/query";
import { SvelteComponentDev } from "svelte/internal";
import { SsrStaticClient } from "./query/SsrStaticClient";
import { Preload, PreloadType } from "./types";
import { Route, Location } from "./router/routerTypes";

type Manifest = {
  [id: string]: string[];
};

const getPreloadsFromRoute = (manifest: Manifest, route: Route): Preload[] => {
  const scripts = ["../.sveet/client.js", route.id]
    .map(id => {
      return manifest[id].map(path => `/static/${path}`);
    })
    .reduce((acc, dependencies) => [...acc, ...dependencies]);

  return Array.from(new Set(scripts)).map(href => ({
    href: href,
    as: PreloadType.script,
    crossorigin: true
  }));
};

const concatPreloadsFrom = (...preloads: Preload[][]) => {
  return preloads.reduce((acc, source) => [...acc, ...source], []);
};

const renderPreloads = (preloads: Preload[]) => {
  return preloads
    .map(attributes => {
      const attributesString = Object.entries(attributes)
        .map(([key, value]) => {
          if (typeof value === "boolean") {
            return key;
          }

          return `${key}="${value}"`;
        })
        .join(" ");

      return `<link rel="preload" ${attributesString} />`;
    })
    .join("");
};

export default (App: SvelteComponentDev) => (routes: Route[]) => async (
  {
    initialPage,
    staticClient
  }: {
    initialPage: Location;
    staticClient: SsrStaticClient;
  },
  { manifest }: { manifest: Manifest }
) => {
  let client = staticClient.clone();
  setGlobalStaticClient(staticClient);

  // We are loading each component in order to make sure that all staticQueries
  // are loaded and avoid issues while navigating client side.
  // This is actually an approximation because it will only register static queries
  // that are code split using the routing mechanism. But it won't register
  // staticQueries code split using another mechanism. This is an acceptable tradeoff.
  await loadAllRoutes(routes);

  const route = await preload(routes, initialPage);

  const result = App.render({
    routes: routes,
    initialPage,
    staticClient: client
  });

  const preloads = concatPreloadsFrom(
    route ? getPreloadsFromRoute(manifest, route) : [],
    client.getPreloads()
  );

  result.head = renderPreloads(preloads) + result.head;
  result.dependencies = preloads.map(({ href }) => href);

  return result;
};
