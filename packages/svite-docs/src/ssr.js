import App from "./App.svelte";
import { preload } from "./modules/router/store";

export default ({ initialPage, staticClient }) => {
  return preload(initialPage).then(() => {
    return App.render({
      initialPage,
      staticClient
    });
  });
};
