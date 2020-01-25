import fetch from "node-fetch";
import { StaticClient } from "./StaticClient";

const fetchWithOrigin = (url: string, options: any) => {
  return fetch(`http://localhost:3000${url}`, options);
};

class SsrStaticClient extends StaticClient {
  constructor() {
    super({ fetch: fetchWithOrigin });
  }
}

export { SsrStaticClient };
