import routes from "../../../.sveet/routes";

export const getRouteFromLocation = location => {
  const route = routes.find(route => {
    return route.path.test(location.pathname.replace(/[?#].*$/, ""));
  });

  if (!route) {
    return null;
  }

  return route;
};
