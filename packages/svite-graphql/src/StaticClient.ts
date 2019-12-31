import CacheClient from "./Client";

export type Query = string;
export type Variables = object;
type Result = object;
export type GraphQLClientOptions = {
  uri: string;
};

class GraphQLClient {
  private cache: CacheClient<Query, Variables, Result>;

  constructor() {
    this.cache = new CacheClient<Query, Variables, Result>();
  }

  fetch({ query, variables }: { query: Query; variables: Variables }) {
    return fetch(
      `__svite/data/${query}/${encodeURIComponent(
        JSON.stringify(variables)
      )}.json`,
      {
        method: "GET"
      }
    ).then(response => response.json());
  }

  query(query: Query, variables: Variables) {
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

export default GraphQLClient;
