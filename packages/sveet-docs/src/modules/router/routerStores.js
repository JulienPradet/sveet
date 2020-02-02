import { writable, derived } from "svelte/store";
import { onLocationChange } from "./history";
import { preload } from "./preload";
import { getRouteFromLocation } from "./getRouteFromLocation";

export const makeRouterStores = initialPage => {
  const page = writable(initialPage);

  if (typeof window !== "undefined") {
    onLocationChange(location => {
      let shouldTransition = true;
      const timeout = setTimeout(() => {
        shouldTransition = false;
        page.update(() => location);
      }, 100);

      preload(location).then(() => {
        if (shouldTransition) {
          clearTimeout(timeout);
          page.update(() => location);
        }
      });
    });
  }

  const route = derived(page, $page => {
    const route = getRouteFromLocation($page);
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
