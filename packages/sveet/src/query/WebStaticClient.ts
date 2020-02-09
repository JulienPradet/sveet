import CacheClient from "./CacheClient";
import { StaticClient, Hash, Variables, Result } from "./StaticClient";

export type GraphQLClientOptions = {
  uri: string;
};

const originalFetch = (url: string, options: object) =>
  fetch(url, options).then(response => response.json());

class WebStaticClient implements StaticClient {
  private fetcher: any;
  private cache: CacheClient<Hash, Variables, Result>;
  private requestsCache: CacheClient<Hash, Variables, Promise<Result>>;

  constructor(options?: { fetch?: any }) {
    this.cache = new CacheClient<Hash, Variables, Result>();
    this.requestsCache = new CacheClient<Hash, Variables, Promise<Result>>();
    this.fetcher = (options && options.fetch) || originalFetch;
  }

  __isStaticClient = true;

  fetch({ hash, props }: { hash: Hash; props: Variables }): Promise<Result> {
    const cachedRequest = this.requestsCache.get(hash, props);
    if (cachedRequest) {
      return cachedRequest;
    }

    const request = this.fetcher(
      `/__sveet/data/${hash}/${encodeURIComponent(JSON.stringify(props))}.json`,
      {
        method: "GET"
      }
    ).then((response: Result) => {
      this.requestsCache.delete(hash, props);
      return response;
    });

    this.requestsCache.set(hash, props, request);

    return request;
  }

  query(hash: Hash, props: Variables): Result | Promise<Result> {
    const cachedData = this.cache.get(hash, props);
    if (cachedData) {
      return cachedData;
    }

    return this.fetch({ hash: hash, props: props }).then(result => {
      this.cache.set(hash, props, result);
      return result;
    });
  }
}

export { WebStaticClient };
