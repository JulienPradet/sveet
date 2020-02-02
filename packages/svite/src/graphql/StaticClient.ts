import CacheClient from "./CacheClient";

export type Query = string;
export type Variables = object;
type Result = object;
export type GraphQLClientOptions = {
  uri: string;
};

const originalFetch = (url: string, options: object) => fetch(url, options);

class StaticClient {
  private fetcher: any;
  private cache: CacheClient<Query, Variables, Result>;
  private requestsCache: CacheClient<Query, Variables, Promise<Result>>;

  constructor(options?: { fetch?: any }) {
    this.cache = new CacheClient<Query, Variables, Result>();
    this.requestsCache = new CacheClient<Query, Variables, Promise<Result>>();
    this.fetcher = (options && options.fetch) || originalFetch;
  }

  fetch({
    query,
    variables
  }: {
    query: Query;
    variables: Variables;
  }): Promise<Result> {
    const cachedRequest = this.requestsCache.get(query, variables);
    if (cachedRequest) {
      return cachedRequest;
    }

    const request = this.fetcher(
      `/__svite/data/${query}/${encodeURIComponent(
        JSON.stringify(variables)
      )}.json`,
      {
        method: "GET"
      }
    ).then((response: Response) => {
      this.requestsCache.delete(query, variables);
      return response.json();
    });

    this.requestsCache.set(query, variables, request);

    return request;
  }

  query(query: Query, variables: Variables): Result | Promise<Result> {
    const cachedData = this.cache.get(query, variables);
    if (cachedData) {
      return cachedData;
    }

    return this.fetch({ query: query, variables: variables }).then(result => {
      this.cache.set(query, variables, result);
      return result;
    });
  }
}

export { StaticClient };
