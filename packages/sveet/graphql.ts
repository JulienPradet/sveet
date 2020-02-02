export { StaticClient } from "./src/graphql/StaticClient";
export { setStaticClient } from "./src/graphql/context";
export { staticQuery } from "./src/graphql/staticQuery";

export const gql = () => {
  throw new Error(
    'This graphql tag should not be used. Please use "sveet-graphql/preprocess" in your svelte configuration first.'
  );
};
