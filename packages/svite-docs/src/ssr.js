import "isomorphic-fetch";
import App from "./App.svelte";
import { preload } from "./modules/router/store";

export default ({ initialPage }) => {
  // return preload(initialPage).then(() => {
  return App.render({
    initialPage
  });
  // });
};
