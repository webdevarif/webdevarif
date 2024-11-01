'use client';
"use strict";
exports.__esModule = true;
var queries_1 = require("@/actions/queries");
var Footer_1 = require("@/components/Footer");
var Header_1 = require("@/components/Header");
var react_1 = require("react");
var PrimaryLayout = function (_a) {
    var children = _a.children;
    var _b = queries_1.themeQueries.getSettings(), data = _b.data, error = _b.error;
    if (error)
        return react_1["default"].createElement("div", null, "Error loading data.");
    if (!data)
        return;
    return (react_1["default"].createElement(react_1["default"].Fragment, null,
        react_1["default"].createElement(Header_1["default"], { identity: data === null || data === void 0 ? void 0 : data.identity, menu: data === null || data === void 0 ? void 0 : data.menu }),
        react_1["default"].createElement("main", null, children),
        react_1["default"].createElement(Footer_1["default"], { identity: data === null || data === void 0 ? void 0 : data.identity, menu: data === null || data === void 0 ? void 0 : data.menu })));
};
exports["default"] = PrimaryLayout;
