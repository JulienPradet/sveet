import { getStaticClient } from "./context";
import { Query, Variables } from "./StaticClient";

export const staticQuery = (query: Query, variables: Variables) => {
  return getStaticClient().query(query, variables);
};
