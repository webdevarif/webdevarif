"use client";
"use strict";
exports.__esModule = true;
var react_1 = require("react");
var CardProject_1 = require("@/components/Card/CardProject");
var queries_1 = require("@/actions/queries");
var button_1 = require("@/components/ui/button");
var link_1 = require("next/link");
var Projects = function () {
    var _a = queries_1.useProjects("current-page=1&per-page=6"), data = _a.data, isLoading = _a.isLoading;
    return (react_1["default"].createElement("section", { className: "py-[100px]" },
        react_1["default"].createElement("div", { className: "container" },
            react_1["default"].createElement("div", { className: "mb-[3rem] mx-auto text-center max-w-[40rem]" },
                react_1["default"].createElement("span", { className: "uppercase font-unbounded font-bold text-4xl mb-3 inline-block" }, "Recent Projects"),
                react_1["default"].createElement("p", { className: "font-medium" }, "Valuable insights to change your startup idea")),
            react_1["default"].createElement("div", { className: "grid grid-cols-3 gap-4" }, isLoading ? (react_1["default"].createElement("p", null, "Loading...")) : (data && data.projects.map(function (project) { return (react_1["default"].createElement(CardProject_1["default"], { key: project.id, post: project })); }))),
            react_1["default"].createElement("div", { className: "text-center mt-[2rem]" },
                react_1["default"].createElement(button_1.Button, { variant: 'default', className: 'h-auto py-4 inline-block min-w-[8rem] max-w-full' },
                    react_1["default"].createElement(link_1["default"], { href: '/projects', className: 'text-md uppercase' }, "View All"))))));
};
exports["default"] = Projects;
