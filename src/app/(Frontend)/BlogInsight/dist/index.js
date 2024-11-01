"use client";
"use strict";
exports.__esModule = true;
var queries_1 = require("@/actions/queries");
var CardBlogPost_1 = require("@/components/Card/CardBlogPost");
var react_1 = require("react");
var BlogInsight = function () {
    var _a = queries_1.blogQueries.getBlogs("current-page=1&per-page=3"), data = _a.data, isLoading = _a.isLoading;
    return (react_1["default"].createElement("section", { className: 'py-[100px]' },
        react_1["default"].createElement("div", { className: "container" },
            react_1["default"].createElement("div", { className: "mb-6 mx-auto text-center max-w-[40rem]" },
                react_1["default"].createElement("span", { className: "uppercase font-unbounded font-bold text-4xl mb-3 inline-block" }, "Blog Insight"),
                react_1["default"].createElement("p", { className: "font-medium" }, "Valuable insights to change your startup idea")),
            react_1["default"].createElement("div", { className: "grid grid-cols-3 gap-4" }, isLoading ? (react_1["default"].createElement("p", null, "Loading...")) : (data && data.blogs.map(function (blog) { return (react_1["default"].createElement(CardBlogPost_1["default"], { key: blog.id, post: blog })); }))))));
};
exports["default"] = BlogInsight;
