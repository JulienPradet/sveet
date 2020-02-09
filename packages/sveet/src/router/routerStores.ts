import { writable, derived, Readable } from "svelte/store";
import { onLocationChange, listenNavigation } from "./history";
import { preload } from "./preload";
import { getRouteFromLocation } from "./getRouteFromLocation";
import { Route, Location, CurrentLocation } from "./routerTypes";

export const makeRouterStores = (routes: Route[], initialPage: Location) => {
  const page = writable(initialPage);

  if (typeof window !== "undefined") {
    listenNavigation();
    onLocationChange(location => {
      let shouldTransition = true;
      const timeout = setTimeout(() => {
        shouldTransition = false;
        page.update(() => location);
      }, 100);

      preload(routes, location).then(() => {
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

  const location: Readable<CurrentLocation> = derived(
    [page, route],
    ([$page, $route]) => {
      const match = $route ? $route.path.exec($page.pathname) : null;
      return {
        ...$page,
        params: match && match.groups ? match.groups : {}
      };
    }
  );

  return { page, route, location };
};
