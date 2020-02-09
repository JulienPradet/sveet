import CacheClient from "./CacheClient";
import { ReplaySubject } from "rxjs";
import { StaticClient, Hash, Variables, Result } from "./StaticClient";
import { Preload, PreloadType } from "../types";

export type QueryFunction = (props: object) => Promise<Result>;

export class SsrStaticClient implements StaticClient {
  private hashMap: Map<Hash, QueryFunction>;
  private cache: CacheClient<Hash, Variables, Result>;
  private requestsCache: CacheClient<Hash, Variables, Promise<Result>>;
  private fetchedRequests: Set<string>;
  private request$?: ReplaySubject<{
    hash: Hash;
    props: Variables;
    result: Result;
  }>;

  constructor(
    {
      hashMap,
      cache,
      requestsCache,
      request$
    }: {
      hashMap: Map<Hash, QueryFunction>;
      cache: CacheClient<Hash, Variables, Result>;
      requestsCache: CacheClient<Hash, Variables, Promise<Result>>;
      request$?: ReplaySubject<{
        hash: Hash;
        props: Variables;
        result: Result;
      }>;
    } = {
      hashMap: new Map(),
      cache: new CacheClient(),
      requestsCache: new CacheClient(),
      request$: new ReplaySubject()
    }
  ) {
    this.hashMap = hashMap;
    this.cache = cache;
    this.requestsCache = requestsCache;
    this.request$ = request$;
    this.fetchedRequests = new Set();
  }

  __isStaticClient = true;

  registerQuery(hash: Hash, queryFunction: QueryFunction) {
    this.hashMap.set(hash, queryFunction);
    return (props: Variables) => {
      return this.query(hash, props);
    };
  }

  query(hash: Hash, props: Variables): Result | Promise<Result> {
    if (!this.hashMap.has(hash)) {
      throw new Error(`Query with hash ${hash} was not registered.`);
    }

    const url = `/__sveet/data/${hash}/${encodeURIComponent(
      JSON.stringify(props)
    )}.json`;
    this.fetchedRequests.add(url);

    const cachedData = this.cache.get(hash, props);
    if (cachedData) {
      return cachedData;
    }

    const cachedRequest = this.requestsCache.get(hash, props);
    if (cachedRequest) {
      return cachedRequest;
    }

    const queryFunction = this.hashMap.get(hash) as QueryFunction;
    const request = queryFunction(props).then(result => {
      this.cache.set(hash, props, result);
      if (this.request$) {
        this.request$.next({
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

  clone() {
    // The goal is to reuse cache and everything else but to
    // keep track of the fetched requests for a single SSR pass.
    return new SsrStaticClient({
      hashMap: this.hashMap,
      cache: this.cache,
      requestsCache: this.requestsCache,
      request$: this.request$
    });
  }

  getPreloads(): Preload[] {
    return Array.from(this.fetchedRequests).map(url => {
      return {
        href: url,
        as: PreloadType.fetch,
        crossorigin: true
      };
    });
  }

  getFetchedRequests$() {
    if (this.request$) {
      return this.request$.asObservable();
    }

    throw new Error("Static Client was already closed");
  }

  closeClient() {
    if (this.request$) {
      this.request$.complete();
      this.request$ = undefined;
      return;
    }

    throw new Error("Static Client was already closed");
  }
}
