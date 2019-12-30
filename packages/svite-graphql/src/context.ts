import { getContext, setContext } from "svelte";
import GraphQLClient, { GraphQLClientOptions } from "./GraphQLClient";

const CLIENT =
  typeof Symbol !== "undefined" ? Symbol("svite-graphql") : "@@svite-graphql";

export function getGraphQLClient(): GraphQLClient {
  return getContext(CLIENT);
}

export function setGraphQLClient(options: GraphQLClientOptions) {
  setContext(CLIENT, new GraphQLClient(options));
}
