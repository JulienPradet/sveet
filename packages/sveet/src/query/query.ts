import { RequestInfo, RequestInit, Response } from "node-fetch";
import { SsrStaticClient, QueryFunction } from "./SsrStaticClient";
import { Hash, Variables } from "./StaticClient";
import {
  getStaticClient as getGlobalStaticClient,
  setStaticClient as setGlobalStaticClient
} from "./context";
import { getStaticClient } from "./context";

export { getStaticClient, setStaticClient } from "./context";
export { getGlobalStaticClient, setGlobalStaticClient };
export { WebStaticClient } from "./WebStaticClient";
export { staticQuery } from "./staticQuery";

export const registerQuery = (hash: Hash, queryFunction: QueryFunction) => {
  const staticClient = getGlobalStaticClient() as SsrStaticClient;
  staticClient.registerQuery(hash, queryFunction);

  // Refetch the staticClient at execution time in order to make
  // sure that it is the one attached on the current render and not
  // the main one.
  // This will allow to have a correct SsrStaticClient::fetchedRequests
  // during SSR.
  return ensureStaticClient(
    (props: Variables, staticClient: SsrStaticClient) => {
      return staticClient.query(hash, props);
    },
    true
  );
};

export const ensureStaticClient = (
  fn: (...args: any[]) => any,
  global: boolean
) => {
  return (...args: any[]) => {
    const potentialStaticClient = args[args.length - 1];
    if (potentialStaticClient.__isStaticClient) {
      return fn(...args);
    } else {
      const staticClient = global ? getGlobalStaticClient() : getStaticClient();
      return fn(...args, staticClient);
    }
  };
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
