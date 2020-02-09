export const getRouteFromLocation = (routes, location) => {
  const route = routes.find(route => {
    return route.path.test(location.pathname.replace(/[?#].*$/, ""));
  });

  if (!route) {
    return null;
  }

  return route;
};
