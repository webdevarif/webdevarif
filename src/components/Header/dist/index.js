"use client";
"use strict";
exports.__esModule = true;
var image_1 = require("next/image");
var link_1 = require("next/link");
var react_1 = require("react");
var navigation_menu_1 = require("@/components/ui/navigation-menu");
var button_1 = require("@/components/ui/button");
var lucide_react_1 = require("lucide-react");
var fi_1 = require("react-icons/fi");
var Header = function (_a) {
    var identity = _a.identity, menu = _a.menu;
    return (react_1["default"].createElement("header", { className: 'header py-2 xl:py-4 absolute start-0 end-0 top-0 z-10 border-b border-black', id: "home" },
        react_1["default"].createElement("div", { className: "container" },
            react_1["default"].createElement("div", { className: "grid grid-cols-[40px_1fr_auto] xl:grid-cols-[auto_1fr_auto] gap-x-[10px] items-center xl:gap-x-[30px]" },
                react_1["default"].createElement("div", { className: "inline-flex xl:hidden items-center justify-center" },
                    react_1["default"].createElement(button_1.Button, { variant: 'ghost', size: 'icon' },
                        react_1["default"].createElement(lucide_react_1.AlignJustify, null))),
                react_1["default"].createElement("div", { className: "header__logo max-w-[120px] xl:max-w-[150px] w-[40vw]" },
                    react_1["default"].createElement(link_1["default"], { className: 'relative inline-flext', href: '/' }, (identity === null || identity === void 0 ? void 0 : identity.logo) && react_1["default"].createElement(image_1["default"], { src: identity.logo, width: 200, height: 60, alt: 'web developer', className: 'h-[25px] w-auto' }))),
                react_1["default"].createElement("div", { className: "header__navbar hidden xl:flex items-center text-sm font-unbounded uppercase" }, menu &&
                    react_1["default"].createElement(navigation_menu_1.NavigationMenu, null,
                        react_1["default"].createElement(navigation_menu_1.NavigationMenuList, null, menu.map(function (item, index) { return (react_1["default"].createElement(navigation_menu_1.NavigationMenuItem, { key: index },
                            item.children.length > 0 ? react_1["default"].createElement(navigation_menu_1.NavigationMenuTrigger, null, item.title) :
                                react_1["default"].createElement(link_1["default"], { href: item.url },
                                    react_1["default"].createElement(navigation_menu_1.NavigationMenuLink, { className: navigation_menu_1.navigationMenuTriggerStyle() }, item.title)),
                            item.children.length > 0 &&
                                react_1["default"].createElement(navigation_menu_1.NavigationMenuContent, null,
                                    react_1["default"].createElement("ul", { className: 'w-[15rem] py-2 px-3' }, item.children.map(function (sub, subIndex) { return (react_1["default"].createElement("li", { key: subIndex },
                                        react_1["default"].createElement(navigation_menu_1.NavigationMenuLink, { asChild: true },
                                            react_1["default"].createElement(link_1["default"], { className: 'py-2 block px-4', href: sub.url }, sub.title)))); }))))); })))),
                react_1["default"].createElement("div", { className: "header__button" },
                    react_1["default"].createElement("span", { className: "inline-block relative z-10 before:transition-all before:duration-300 before:ease-linear before:content-[''] before:w-full before:h-full before:bg-black before:absolute before:end-0 before:z-[-1] before:translate-y-0 hover:before:-end-[0.35rem] hover:before:translate-y-[0.35rem]" },
                        react_1["default"].createElement(button_1.Button, { variant: 'outline', size: 'lg', asChild: true },
                            react_1["default"].createElement(link_1["default"], { href: "/schedule", className: 'inline-flex items-center gap-2 uppercase font-unbounded text-sm' },
                                react_1["default"].createElement("span", null, "Let's Talk"),
                                react_1["default"].createElement(fi_1.FiMessageSquare, { className: 'w-5 h-5' })))))))));
};
exports["default"] = Header;
