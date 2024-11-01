'use client';
"use strict";
exports.__esModule = true;
var react_1 = require("react");
var swr_1 = require("swr");
var fetcher_1 = require("@/lib/fetcher");
var SWRLayout = function (_a) {
    var children = _a.children;
    return (react_1["default"].createElement(swr_1.SWRConfig, { value: { fetcher: fetcher_1["default"] } }, children));
};
exports["default"] = SWRLayout;
