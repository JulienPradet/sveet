import { Location } from "./routerTypes";

let listeners = new Set<(location: Location) => void>();
const notifyListeners = (location: Location) => {
  listeners.forEach(listener => listener(location));
};

export const ensureLocation = (location: Location | string): Location => {
  if (typeof location === "string") {
    const url = new URL(location);
    return {
      pathname: url.pathname,
      search: url.search,
      state: null
    };
  } else {
    return location;
  }
};

export const push = (location: Location | string) => {
  const _location = ensureLocation(location);
  history.pushState(_location.state, "", _location.pathname);
  notifyListeners(_location);
};

export const onLocationChange = (fn: (location: Location) => void) => {
  listeners.add(fn);
};

export const listenNavigation = () => {
  window.addEventListener("popstate", event => {
    notifyListeners({
      pathname: document.location.pathname,
      search: document.location.search,
      state: null
    });
  });

  document.addEventListener(
    "click",
    event => {
      if (event && event.target) {
        const target = event.target as Element;
        const tag = target.closest("a");
        if (tag) {
          event.preventDefault();
          push(tag.href);
        }
      }
    },
    { capture: true }
  );
};
