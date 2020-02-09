import { getStaticClient } from "./context";
import { Hash, Variables } from "./StaticClient";

export const staticQuery = (hash: Hash, props: Variables) => {
  return getStaticClient().query(hash, props);
};
