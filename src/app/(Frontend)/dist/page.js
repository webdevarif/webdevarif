"use strict";
exports.__esModule = true;
var react_1 = require("react");
var Hero_1 = require("./Hero");
var ContactForm_1 = require("@/components/ContactForm");
var BlogInsight_1 = require("./BlogInsight");
var Projects_1 = require("./Projects");
var AboutMe_1 = require("./AboutMe");
var HomePage = function () {
    return (react_1["default"].createElement("div", null,
        react_1["default"].createElement(Hero_1["default"], null),
        react_1["default"].createElement(AboutMe_1["default"], null),
        react_1["default"].createElement(Projects_1["default"], null),
        react_1["default"].createElement(ContactForm_1["default"], null),
        react_1["default"].createElement(BlogInsight_1["default"], null)));
};
exports["default"] = HomePage;
