import { ensureLocation } from "./history";
import { getRouteFromLocation } from "./getRouteFromLocation";
import { Route, Location } from "./routerTypes";

export const preload = async (routes: Route[], location: Location) => {
  const _location = ensureLocation(location);
  const route = getRouteFromLocation(routes, _location);
  if (route) {
    const component = await route.component();
    route.resolvedComponent = component;
    if (typeof component.preload === "function") {
      const match = route.path.exec(location.pathname);
      const params = match && match.groups ? match.groups : {};
      await component.preload({
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
