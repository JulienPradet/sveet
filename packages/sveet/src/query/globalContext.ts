import { StaticClient } from "./StaticClient";
import { getContext, setContext } from "svelte";

const contextKey = {};

export function getStaticClient(): StaticClient {
  return getContext(contextKey);
}

export function setStaticClient(staticClient: StaticClient) {
  setContext(contextKey, staticClient);
}
