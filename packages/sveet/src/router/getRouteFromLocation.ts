import { Location, Route } from "./routerTypes";

export const getRouteFromLocation = (
  routes: Route[],
  location: Location
): Route | null => {
  const route = routes.find(route => {
    return route.path.test(location.pathname.replace(/[?#].*$/, ""));
  });

  if (!route) {
    return null;
  }

  return route;
};
