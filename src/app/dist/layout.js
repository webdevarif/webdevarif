"use strict";
exports.__esModule = true;
exports.metadata = void 0;
var google_1 = require("next/font/google");
require("@/fonts/style.css");
require("@/styles/globals.css");
var next_themes_1 = require("next-themes");
var PrimaryLayout_1 = require("@/layouts/PrimaryLayout");
var SWRLayouts_1 = require("@/layouts/SWRLayouts");
var head_1 = require("next/head");
var unbounded = google_1.Unbounded({
    subsets: ["latin"],
    weight: ['400', '500', '600', '700'],
    variable: '--font-unbounded'
});
var hind = google_1.Hind_Siliguri({
    subsets: ["latin"],
    weight: ['400', '500', '600', '700'],
    variable: '--font-hind'
});
var manrope = google_1.Manrope({
    subsets: ["latin"],
    weight: ['400', '500', '600', '700'],
    variable: '--font-manrope'
});
var outfit = google_1.Outfit({
    subsets: ["latin"],
    weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    variable: '--font-outfit'
});
exports.metadata = {
    title: "Web Developer Arif",
    description: ""
};
function RootLayout(_a) {
    var children = _a.children;
    return (React.createElement(SWRLayouts_1["default"], null,
        React.createElement("html", { lang: "en" },
            React.createElement(head_1["default"], null,
                React.createElement("link", { rel: "shortcut icon", href: "/favicon.ico" })),
            React.createElement("body", { className: unbounded.variable + " " + manrope.variable + " " + outfit.variable + " smooth-scrollbar" },
                React.createElement(next_themes_1.ThemeProvider, null,
                    React.createElement(PrimaryLayout_1["default"], null, children))))));
}
exports["default"] = RootLayout;
