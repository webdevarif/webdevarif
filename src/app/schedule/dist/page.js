"use client";
"use strict";
exports.__esModule = true;
var PageLayout_1 = require("@/layouts/PageLayout");
var react_1 = require("react");
var SchedulePage = function () {
    react_1.useEffect(function () {
        var script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        document.body.appendChild(script);
        return function () {
            document.body.removeChild(script);
        };
    }, []);
    return (react_1["default"].createElement(PageLayout_1["default"], null,
        react_1["default"].createElement("div", { className: "pt-[100px] text-center" },
            react_1["default"].createElement("div", { className: "container" },
                react_1["default"].createElement("h5", { className: "font-unbounded text-5xl font-semibold uppercase" }, "Schedule a meeting"))),
        react_1["default"].createElement("div", { className: "" },
            react_1["default"].createElement("div", { className: "container" },
                react_1["default"].createElement("div", { className: "" },
                    react_1["default"].createElement("div", { className: "calendly-inline-widget", "data-url": "https://calendly.com/webgeniusplus/30min", style: { minWidth: '320px', height: '700px' } }))))));
};
exports["default"] = SchedulePage;
