import { writable } from "svelte/store";
import routes from "../../../.svite/routes";

const ensureLocation = location => {
  return typeof location === "string"
    ? { pathname: location, state: {} }
    : location;
};

const getRouteFromLocation = location => {
  return (
    routes.find(route => {
      return location.pathname === route.path;
    }) || null
  );
};

const page = writable({
  pathname: window.location.pathname,
  state: window.history.state
});

page.subscribe(page => {
  console.log(page);
});

const goto = location => {
  const _location = ensureLocation(location);
  history.pushState(_location.state, "", _location.pathname);
  page.update(() => {
    return _location;
  });
};

const preload = location => {
  const _location = ensureLocation(location);
  const route = getRouteFromLocation(_location);
  if (route) {
    route.component().then(component => {
      if (typeof component.preload === "function") {
        component.preload(location);
      }
    });
  }
};

export default page;

export { goto, preload };
