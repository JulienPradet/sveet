import sum from "hash-sum";

export type Query = string;
export type Hash = string;

class QueryManager {
  private hashMap: Map<Hash, Query>;

  constructor() {
    this.hashMap = new Map();
  }

  registerQuery(query: Query): Hash {
    const hash = sum(query);
    this.hashMap.set(hash, query);
    return hash;
  }

  getQuery(hash: Hash): Query | undefined {
    return this.hashMap.get(hash);
  }
}

export default QueryManager;
