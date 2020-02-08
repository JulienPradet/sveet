import { RequestInfo, RequestInit, Response } from "node-fetch";
import {
  SsrStaticClient,
  Hash,
  QueryFunction
} from "./src/query/SsrStaticClient";
import { getStaticClient } from "./src/query/context";

export { StaticClient } from "./src/query/StaticClient";
export { setStaticClient } from "./src/query/context";
export { staticQuery } from "./src/query/staticQuery";

export const registerQuery = (hash: Hash, queryFunction: QueryFunction) => {
  const staticClient = getStaticClient() as SsrStaticClient;
  return staticClient.registerQuery(hash, queryFunction);
};

export const fetch = (
  url: RequestInfo,
  init?: RequestInit | undefined
): Promise<Response> => {
  throw new Error(`
    This fetch should not be used at runtime. Please check
    that your tools are configured properly and that the
    \`sveet/query/preprocess\` is used in your Svelte
    configuration.
  `);
};
