import { getGraphQLClient } from "./context";
import { Query, Variables } from "./GraphQLClient";

export default (query: Query, variables: Variables) => {
  return getGraphQLClient().query(query, variables);
};
