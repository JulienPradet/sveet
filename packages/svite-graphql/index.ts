export const gql = () => {
  throw new Error(
    'This graphql tag should not be used. Please use "svite-graphql/preprocess" in your svelte configuration first.'
  );
};
