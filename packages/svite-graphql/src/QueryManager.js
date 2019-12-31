"use strict";
exports.__esModule = true;
var hash_sum_1 = require("hash-sum");
var QueryManager = /** @class */ (function () {
    function QueryManager() {
        this.hashMap = new Map();
    }
    QueryManager.prototype.registerQuery = function (query) {
        var hash = hash_sum_1["default"](query);
        this.hashMap.set(hash, query);
        return hash;
    };
    QueryManager.prototype.getQuery = function (hash) {
        return this.hashMap.get(hash);
    };
    return QueryManager;
}());
exports["default"] = QueryManager;
