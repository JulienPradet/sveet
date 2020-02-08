import { StaticClient } from "./StaticClient";
import { SsrStaticClient } from "../query/SsrStaticClient";

let context: StaticClient | SsrStaticClient;

export function getStaticClient(): StaticClient | SsrStaticClient {
  return context;
}

export function setStaticClient(staticClient: StaticClient | SsrStaticClient) {
  context = staticClient;
}
