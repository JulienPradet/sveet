import { StaticClient } from "./StaticClient";

let context: StaticClient;

export function getStaticClient(): StaticClient {
    return context;
}

export function setStaticClient(staticClient: StaticClient) {
    context = staticClient;
}
