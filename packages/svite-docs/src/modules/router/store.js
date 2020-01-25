import { writable, derived } from "svelte/store";
import routes from "../../../.svite/routes";

const ensureLocation = location => {
  return typeof location === "string"
    ? { pathname: location, state: null }
    : location;
};

const getRouteFromLocation = location => {
  return (
    routes.find(route => {
      return location.pathname === route.path;
    }) || null
  );
};

// const goto = location => {
//   const _location = ensureLocation(location);
//   history.pushState(_location.state, "", _location.pathname);
//   getContext(pageContextKey).update(() => {
//     return _location;
//   });
// };

const preload = async location => {
  const _location = ensureLocation(location);
  const route = getRouteFromLocation(_location);
  if (route) {
    const component = await route.component();
    route.resolvedComponent = component;
    if (typeof component.preload === "function") {
      await component.preload(location);
    }
    return route;
  } else {
    return null;
  }
};

const makeRouterStore = initialPage => {
  const page = writable(initialPage);

  const route = derived(page, $page => {
    const route = getRouteFromLocation($page);
    return route;
  });

  return { page, route };
};

export { makeRouterStore, preload };
