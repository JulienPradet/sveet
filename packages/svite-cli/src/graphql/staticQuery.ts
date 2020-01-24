import { getStaticClient } from "./context";
import { Query, Variables } from "./StaticClient";

export default (query: Query, variables: Variables) => {
  return getStaticClient().query(query, variables);
};
