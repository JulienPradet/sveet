import fetch from "node-fetch";
import { StaticClient } from "./StaticClient";

const fetchWithOrigin = (fetchedRequests: Set<string>) => (
  url: string,
  options: any
) => {
  fetchedRequests.add(url);
  return fetch(`http://localhost:3000${url}`, options).then(response => {
    return response;
  });
};

class SsrStaticClient extends StaticClient {
  private fetchedRequests: Set<string>;

  constructor() {
    const fetchedRequests = new Set<string>();
    super({ fetch: fetchWithOrigin(fetchedRequests) });
    this.fetchedRequests = fetchedRequests;
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
}

export { SsrStaticClient };
