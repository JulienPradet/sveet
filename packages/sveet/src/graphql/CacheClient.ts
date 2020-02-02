class CacheClient<Query, Variables, Result> {
  private cache: Map<Query, Map<string, Result>>;

  constructor() {
    this.cache = new Map();
  }

  hashVariables(variables: Variables) {
    return JSON.stringify(variables);
  }

  get(query: Query, variables: Variables): Result | undefined {
    const variablesKey = this.hashVariables(variables);
    if (this.cache.has(query)) {
      const queryCache = this.cache.get(query) as Map<string, Result>;
      if (queryCache.has(variablesKey)) {
        return queryCache.get(variablesKey);
      }
    }
  }

  set(
    query: Query,
    variables: Variables,
    result: Result
  ): CacheClient<Query, Variables, Result> {
    const variablesKey = this.hashVariables(variables);

    const queryCache = (this.cache.has(query)
      ? this.cache.get(query)
      : new Map()) as Map<string, Result>;

    queryCache.set(variablesKey, result);

    this.cache.set(query, queryCache);

    return this;
  }

  delete(query: Query, variables: Variables) {
    const variablesKey = this.hashVariables(variables);
    if (this.cache.has(query)) {
      const queryCache = this.cache.get(query) as Map<string, Result>;
      queryCache.delete(variablesKey);
    }
  }
}

export default CacheClient;
