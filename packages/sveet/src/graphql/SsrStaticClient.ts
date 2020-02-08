import fetch from "node-fetch";
import { StaticClient } from "./StaticClient";
import QueryManager from "./QueryManager";
import GraphQLClient from "./GraphQLClient";
import { ReplaySubject } from "rxjs";

export type Query = string;
export type Variables = object;
export type Result = object;
export type Request = {
  query: Query;
  variables: Variables;
  result: Result;
};

const fetchWithOrigin = (fetchedRequests: Set<string>) => (
  url: string,
  options: any
) => {
  fetchedRequests.add(url);
  return fetch(`http://localhost:3000${url}`, options).then(response => {
    return response.json();
  });
};

class SsrStaticClient extends StaticClient {
  private queryManager: QueryManager;
  private fetchedRequests: Set<string>;
  private client: GraphQLClient;
  private subject?: ReplaySubject<Request>;

  constructor(queryManager: QueryManager, client: GraphQLClient) {
    const fetchedRequests = new Set<string>();
    super({ fetch: fetchWithOrigin(fetchedRequests) });
    this.queryManager = queryManager;
    this.fetchedRequests = fetchedRequests;
    this.client = client;
    this.subject = new ReplaySubject();
  }

  fetch({ query, variables }: { query: Query; variables: Variables }) {
    const actualQuery = this.queryManager.getQuery(query);
    if (typeof actualQuery === "undefined") {
      return Promise.reject(
        new Error(`Query ${JSON.stringify(query)} not found`)
      );
    }
    return this.client
      .query(actualQuery as string, variables)
      .then((result: Result) => {
        if (this.subject) {
          this.subject.next({
            query,
            variables,
            result
          });
        }
        return result;
      });
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

export { SsrStaticClient };
