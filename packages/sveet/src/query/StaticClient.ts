export type Hash = string;
export type Variables = object;
export type Result = object;

interface StaticClient {
  query(hash: Hash, props: Variables): Result | Promise<Result>;
  __isStaticClient: boolean;
}

export { StaticClient };
