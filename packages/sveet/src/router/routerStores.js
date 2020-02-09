import { writable, derived } from "svelte/store";
import { onLocationChange, listenNavigation } from "./history";
import { preload } from "./preload";
import { getRouteFromLocation } from "./getRouteFromLocation";

export const makeRouterStores = (routes, staticClient, initialPage) => {
  const page = writable(initialPage);

  if (typeof window !== "undefined") {
    listenNavigation(routes);
    onLocationChange(location => {
      let shouldTransition = true;
      const timeout = setTimeout(() => {
        shouldTransition = false;
        page.update(() => location);
      }, 100);

      preload(routes, staticClient, location).then(() => {
        if (shouldTransition) {
          clearTimeout(timeout);
          page.update(() => location);
        }
      });
    });
  }

  const route = derived(page, $page => {
    const route = getRouteFromLocation(routes, $page);
    return route;
  });

  const location = derived([page, route], ([$page, $route]) => {
    return {
      ...$page,
      params: $route.path.exec($page.pathname).groups
    };
  });

  return { page, route, location };
};
