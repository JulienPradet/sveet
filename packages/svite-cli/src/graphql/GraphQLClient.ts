import CacheClient from "./CacheClient";

export type Query = string;
export type Variables = object;
export type Result = object;
export type GraphQLClientOptions = {
  uri: string;
  fetch: any;
};

class GraphQLClient {
  private uri: string;
  private cache: CacheClient<Query, Variables, Result>;
  private fetcher: any;

  constructor(options: GraphQLClientOptions) {
    this.uri = options.uri;
    this.fetcher = options.fetch;
    this.cache = new CacheClient<Query, Variables, Result>();
  }

  cleanCache(query: Query, variables: Variables) {
    this.cache.delete(query, variables);
  }

  fetch({
    query,
    variables
  }: {
    query: Query;
    variables: Variables;
  }): Promise<Result> {
    return this.fetcher(this.uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        variables
      })
    }).then((response: Response) => response.json());
  }

  query(query: Query, variables: Variables): Promise<Result> {
    const cachedData = this.cache.get(query, variables);
    if (cachedData) {
      return Promise.resolve(cachedData);
    }

    return this.fetch({ query: query, variables: variables }).then(result => {
      this.cache.set(query, variables, result);
      setTimeout(() => this.cleanCache(query, variables), 5000);
      return result;
    });
  }
}

export default GraphQLClient;
