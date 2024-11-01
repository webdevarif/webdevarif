"use strict";
// CardProject.tsx
exports.__esModule = true;
var image_1 = require("next/image");
var link_1 = require("next/link");
var react_1 = require("react");
var button_1 = require("@/components/ui/button");
var card_1 = require("../ui/card");
var config_1 = require("@/lib/config");
var md_1 = require("react-icons/md");
var CardProject = function (_a) {
    var post = _a.post;
    return (react_1["default"].createElement(card_1.Card, { className: 'h-full relative flex flex-col border border-black before:transition-all before:duration-300 before:ease-linear before:content-[""] before:w-full before:h-full before:bg-black group/item before:absolute before:end-0 before:z-[-1] before:translate-y-0 hover:before:-end-[0.35rem] hover:before:translate-y-[0.35rem]' },
        post.featured_image && (react_1["default"].createElement("div", { className: "w-full h-[15rem] overflow-hidden" },
            react_1["default"].createElement(image_1["default"], { className: 'w-full h-full group-hover/item:scale-105 duration-300 transition-all ease-linear object-cover rounded-none', alt: post.title || '', src: post.featured_image, width: 400, height: 300 }))),
        react_1["default"].createElement(card_1.CardHeader, null,
            react_1["default"].createElement(link_1["default"], { href: config_1.Config.cleanBlogURL(post.link), className: 'text-black transition-all duration-300 hover:text-primary' },
                react_1["default"].createElement("h2", { className: "font-unbounded text-sm leading-[1.6] font-medium mb-0" }, post.title))),
        react_1["default"].createElement(card_1.CardContent, { className: 'space-y-3' },
            post.excerpt && react_1["default"].createElement("div", null, post.excerpt),
            post.project_categories && react_1["default"].createElement("div", { className: 'inline-flex gap-2' }, post.project_categories && post.project_categories.map(function (category, index) {
                // Return something for each category
                return (react_1["default"].createElement("span", { key: index, className: "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset " + config_1.Config.projectCategoryClass(category.name) }, category.name));
            }))),
        react_1["default"].createElement(card_1.CardFooter, { className: 'mt-auto border-t border-black pt-5' },
            react_1["default"].createElement(button_1.Button, { variant: 'link', asChild: true, className: 'p-0 text-slate-black hover:text-primary h-auto inline-flex items-center gap-1 uppercase' },
                react_1["default"].createElement(link_1["default"], { href: config_1.Config.cleanBlogURL(post.link) },
                    react_1["default"].createElement("span", null, "Preview"),
                    react_1["default"].createElement(md_1.MdDoubleArrow, null))))));
};
exports["default"] = CardProject;
