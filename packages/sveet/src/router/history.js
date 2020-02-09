let listeners = new Set();
const notifyListeners = location => {
  listeners.forEach(listener => listener(location));
};

export const ensureLocation = location => {
  if (typeof location === "string") {
    const url = new URL(location);
    return {
      pathname: url.pathname,
      search: url.search,
      state: null,
      hash: url.hash
    };
  } else {
    return location;
  }
};

export const push = location => {
  const _location = ensureLocation(location);
  history.pushState(_location.state, "", _location.pathname);
  notifyListeners(_location);
};

export const onLocationChange = fn => {
  listeners.add(fn);
};

export const listenNavigation = () => {
  window.addEventListener("popstate", event => {
    notifyListeners({
      pathname: document.location.pathname,
      search: document.location.search,
      state: null,
      hash: document.location.hash
    });
  });

  document.addEventListener(
    "click",
    event => {
      const tag = event.target.closest("a");
      if (tag) {
        event.preventDefault();
        push(tag.href);
      }
    },
    { capture: true }
  );
};
