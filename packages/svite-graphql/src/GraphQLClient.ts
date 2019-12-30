export type Query = string;
export type Variables = object;
type Result = object;
type Cache = Map<Query, Map<string, Result>>;
export type GraphQLClientOptions = {
  uri: string;
};

class GraphQLClient {
  private uri: string;
  private cache: Cache;

  constructor(options: GraphQLClientOptions) {
    this.uri = options.uri;
    this.cache = new Map();
  }

  fetch({ query, variables }: { query: Query; variables: Variables }) {
    return fetch(this.uri, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        variables
      })
    }).then(response => response.json());
  }

  query(query: Query, variables: Variables) {
    const variablesKey = JSON.stringify(variables);
    if (this.cache.has(query)) {
      const queryCache = this.cache.get(query) as Map<string, Result>;
      if (queryCache.has(variablesKey)) {
        return queryCache.get(variablesKey);
      }
    }

    return this.fetch({ query: query, variables: variables }).then(result => {
      const queryCache = (this.cache.has(query)
        ? this.cache.get(query)
        : new Map()) as Map<string, Result>;
      queryCache.set(variablesKey, result);
      this.cache.set(query, queryCache);

      return result;
    });
  }
}

export default GraphQLClient;
