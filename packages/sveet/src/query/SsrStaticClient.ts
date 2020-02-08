import CacheClient from "./CacheClient";
import { ReplaySubject } from "rxjs";

export type Hash = string;
export type Variables = object;
export type Result = object;
export type QueryFunction = (props: object) => Promise<Result>;

export class SsrStaticClient {
  private hashMap: Map<Hash, QueryFunction>;
  private cache: CacheClient<Hash, Variables, Result>;
  private requestsCache: CacheClient<Hash, Variables, Promise<Result>>;
  private fetchedRequests: Set<string>;
  private subject?: ReplaySubject<{
    hash: Hash;
    props: Variables;
    result: Result;
  }>;

  constructor() {
    this.hashMap = new Map();
    this.cache = new CacheClient();
    this.requestsCache = new CacheClient();
    this.fetchedRequests = new Set();
    this.subject = new ReplaySubject();
  }

  registerQuery(hash: Hash, queryFunction: QueryFunction) {
    this.hashMap.set(hash, queryFunction);
    return (props: Variables) => this.query(hash, props);
  }

  query(hash: Hash, props: Variables): Result | Promise<Result> {
    if (!this.hashMap.has(hash)) {
      throw new Error(`Query with hash ${hash} was not registered.`);
    }

    const cachedData = this.cache.get(hash, props);
    if (cachedData) {
      return cachedData;
    }

    const cachedRequest = this.requestsCache.get(hash, props);
    if (cachedRequest) {
      return cachedRequest;
    }

    const url = `/__sveet/data/${hash}/${encodeURIComponent(
      JSON.stringify(props)
    )}.json`;
    this.fetchedRequests.add(url);

    const queryFunction = this.hashMap.get(hash) as QueryFunction;
    const request = queryFunction(props).then(result => {
      this.cache.set(hash, props, result);
      if (this.subject) {
        this.subject.next({
          hash,
          props,
          result
        });
      }
      return result;
    });
    this.requestsCache.set(hash, props, request);

    return request;
  }

  clearCache() {
    this.fetchedRequests.clear();
    return this;
  }

  getPreloads() {
    return Array.from(this.fetchedRequests).map(url => {
      return {
        href: url,
        as: "fetch",
        crossorigin: true
      };
    });
  }

  getFetchedRequests$() {
    if (this.subject) {
      return this.subject.asObservable();
    }

    throw new Error("Static Client was already closed");
  }

  closeClient() {
    if (this.subject) {
      this.subject.complete();
      this.subject = undefined;
      return;
    }

    throw new Error("Static Client was already closed");
  }
}
