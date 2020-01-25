import { getContext, setContext } from "svelte";
import { StaticClient } from "./StaticClient";

const CLIENT =
  typeof Symbol !== "undefined" ? Symbol("svite-graphql") : "@@svite-graphql";

export function getStaticClient(): StaticClient {
  return getContext(CLIENT);
}

export function setStaticClient(staticClient: StaticClient) {
  setContext(CLIENT, staticClient);
}
