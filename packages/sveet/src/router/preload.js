import { ensureLocation } from "./history";
import { getRouteFromLocation } from "./getRouteFromLocation";

export const preload = async (routes, staticClient, location) => {
  const _location = ensureLocation(location);
  const route = getRouteFromLocation(routes, _location);
  if (route) {
    const component = await route.component();
    route.resolvedComponent = component;
    if (typeof component.preload === "function") {
      const params = route.path.exec(location.pathname).groups;
      await component.preload({
        staticClient,
        location: {
          ..._location,
          params: params
        }
      });
    }
    return route;
  } else {
    return null;
  }
};
