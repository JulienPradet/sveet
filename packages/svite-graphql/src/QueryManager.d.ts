export declare type Query = string;
export declare type Hash = string;
declare class QueryManager {
    private hashMap;
    constructor();
    registerQuery(query: Query): Hash;
    getQuery(hash: Hash): Query | undefined;
}
export default QueryManager;
