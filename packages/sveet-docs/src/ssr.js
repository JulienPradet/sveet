import App from "./App.svelte";
import { preload, loadAllRoutes } from "./modules/router";
import { setStaticClient } from "sveet/query";

const getPreloadsFromRoute = (manifest, route) => {
  const scripts = ["../.sveet/index.js", route.id]
    .map(id => {
      return manifest[id].map(path => `/static/${path}`);
    })
    .reduce((acc, dependencies) => [...acc, ...dependencies]);

  return Array.from(new Set(scripts)).map(href => ({
    href: href,
    as: "script",
    crossorigin: true
  }));
};

const concatPreloadsFrom = (...preloads) => {
  return preloads.reduce((acc, source) => [...acc, ...source], []);
};

const renderPreloads = preloads => {
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

export default async ({ initialPage, staticClient }, { manifest }) => {
  let client = staticClient.clearCache();
  setStaticClient(client);

  // We are loading each component in order to make sure that all staticQueries
  // are loaded and avoid issues while navigating client side.
  // This is actually an approximation because it will only register static queries
  // that are code split using the routing mechanism. But it won't register
  // staticQueries code split using another mechanism. This is an acceptable tradeoff.
  await loadAllRoutes();

  const route = await preload(initialPage);

  const result = App.render({
    initialPage
  });

  const preloads = concatPreloadsFrom(
    getPreloadsFromRoute(manifest, route),
    client.getPreloads()
  );

  result.head = renderPreloads(preloads) + result.head;
  result.dependencies = preloads.map(({ href }) => href);

  return result;
};
