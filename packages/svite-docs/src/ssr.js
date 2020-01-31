import App from "./App.svelte";
import { preload } from "./modules/router/store";
import { setStaticClient } from "svite/graphql";

const getPreloadsFromRoute = (manifest, route) => {
  const scripts = ["../.svite/index.js", route.id]
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

export default ({ initialPage, staticClient }, manifest) => {
  setStaticClient(staticClient);

  return preload(initialPage).then(route => {
    const result = App.render({
      initialPage,
      staticClient
    });

    const preloads = concatPreloadsFrom(
      getPreloadsFromRoute(manifest, route),
      staticClient.getPreloads()
    );

    result.head = renderPreloads(preloads) + result.head;
    result.dependencies = preloads.map(({ href }) => href);

    return result;
  });
};
