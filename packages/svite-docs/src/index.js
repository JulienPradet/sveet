import App from "./App.svelte";

const app = new App({
  target: document.body,
  props: {
    initialPage: {
      pathname: window.location.pathname,
      state: window.history.state
    }
  }
});

export default app;
