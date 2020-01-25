import App from "./App.svelte";
import { preload } from "./modules/router/store";

const getPreloadsFromRoute = (manifest, route) => {
  const scripts = ["../.svite/index.js", route.id]
    .map(id => {
      return manifest[id].map(path => `/static/${path}`);
    })
    .reduce((acc, dependencies) => [...acc, ...dependencies]);

  return Array.from(new Set(scripts)).map(href => ({
    href: href,
    as: "script"
  }));
};

export default ({ initialPage, staticClient }, manifest) => {
  return preload(initialPage).then(route => {
    const preloads = getPreloadsFromRoute(manifest, route);
    return App.render({
      initialPage,
      staticClient,
      preloads
    });
  });
};
