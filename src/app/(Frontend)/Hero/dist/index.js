"use strict";
exports.__esModule = true;
var react_1 = require("react");
var image_1 = require("next/image");
var link_1 = require("next/link");
var PageLayout_1 = require("@/layouts/PageLayout");
var hero_shape_svg_1 = require("./images/hero-shape.svg");
var hero_service_1_png_1 = require("./images/hero-service-1.png");
var hero_service_2_png_1 = require("./images/hero-service-2.png");
var web_developer_arif_jpg_1 = require("./images/web-developer-arif.jpg");
var button_1 = require("@/components/ui/button");
var hi2_1 = require("react-icons/hi2");
var Hero = function () {
    return (react_1["default"].createElement(PageLayout_1["default"], null,
        react_1["default"].createElement("section", { className: "hero-banner pt-[30px] pb-[100px]" },
            react_1["default"].createElement("div", { className: "container" },
                react_1["default"].createElement("div", { className: "bg-black text-white rounded-3xl p-6 grid grid-cols-3 gap-6" },
                    react_1["default"].createElement("div", { className: "" },
                        react_1["default"].createElement(image_1["default"], { src: hero_service_1_png_1["default"], alt: "Service 1", className: 'rounded-2xl' })),
                    react_1["default"].createElement("div", { className: 'text-center flex flex-col justify-center' },
                        react_1["default"].createElement("div", { className: 'inline-block mb-8 relative w-[6rem] h-[6rem] mx-auto z-10\r\n                        before:content-[""] before:bg-white/50 before:absolute before:z-0 before:-translate-x-2/4 before:-translate-y-2/4 before:block before:w-20 before:h-20 before:animate-[pulse-border_1500ms_ease-out_infinite] before:rounded-[50%] before:left-2/4 before:top-2/4\r\n                        ' },
                            react_1["default"].createElement(image_1["default"], { src: web_developer_arif_jpg_1["default"], alt: "Developer Arif", className: 'rounded-full w-full h-full object-cover object-center relative z-10' }),
                            react_1["default"].createElement("span", { className: "" })),
                        react_1["default"].createElement("h3", { className: "font-optima-pro font-normal text-xl mb-3 uppercase" }, "Arif Hossin"),
                        react_1["default"].createElement("h2", { className: "text-4xl leading-[1.3] uppercase font-unbounded font-bold" }, "Thinking for Creativity")),
                    react_1["default"].createElement("div", { className: "" },
                        react_1["default"].createElement(image_1["default"], { src: hero_service_2_png_1["default"], alt: "Service 2", className: 'rounded-2xl' }))),
                react_1["default"].createElement("div", { className: "text-center grid grid-cols-3 gap-6" },
                    react_1["default"].createElement("div", null),
                    react_1["default"].createElement("div", { className: "relative" },
                        react_1["default"].createElement(image_1["default"], { src: hero_shape_svg_1["default"], alt: "hero shape", className: "max-w-full h-auto pointer-events-none" }),
                        react_1["default"].createElement(button_1.Button, { variant: 'ghost', asChild: true },
                            react_1["default"].createElement(link_1["default"], { href: "#section-about", className: 'inline-flex uppercase transition-all duration-150 p-2 hover:bg-transparent hover:text-white h-auto gap-2 flex-col absolute top-2 text-white start-2/4 -translate-x-2/4' },
                                react_1["default"].createElement("span", null, "Scroll Down"),
                                react_1["default"].createElement("span", { className: 'mt-4 border-2 border-white/15 inline-flex w-8 h-14 items-center justify-center rounded-full' },
                                    react_1["default"].createElement(hi2_1.HiChevronDoubleDown, { className: 'scroller-animation' }))))),
                    react_1["default"].createElement("div", null)),
                react_1["default"].createElement("div", { className: "text-center uppercase grid grid-cols-4 gap-0 px-8 pt-5" },
                    react_1["default"].createElement("div", { className: '-mt-[5rem]' },
                        react_1["default"].createElement("div", { className: "relative h-[8rem] flex flex-col justify-center" },
                            react_1["default"].createElement("span", { className: "absolute w-[calc(100%-2.5rem)] h-[calc(100%-2.5rem)] top-0 end-0 border-t-2 border-r-2 border-black rounded-tr-[1.75rem] \r\n                            before:absolute before:content-[''] before:w-[3rem] before:h-[3rem] before:border-b-2 before:border-black before:border-l-2 before:rounded-bl-[1.75rem] before:-start-[calc(2.5rem+2px)] before:-top-[3rem]\r\n                            " }),
                            react_1["default"].createElement("span", { className: "absolute w-[calc(100%-2.5rem)] h-[calc(100%-1.5rem)] bottom-0 -start-[2px] border-b-2 border-l-2 border-black rounded-bl-[1.75rem]\r\n                            \r\n                            before:absolute before:content-[''] before:w-[3rem] before:h-[3rem] before:border-t-2 before:border-black before:border-r-2 before:rounded-tr-[1.75rem] before:-end-[calc(2.5rem+2px)] before:-bottom-[3rem]\r\n                            " }),
                            react_1["default"].createElement("h3", { className: "text-5xl mb-3 font-hind font-bold" }, "320+"),
                            react_1["default"].createElement("p", { className: 'font-unbounded text-black/50 font-semibold text-xs' }, "Happy Customer"))),
                    react_1["default"].createElement("div", { className: 'mt-[3rem]' },
                        react_1["default"].createElement("div", { className: "relative h-[8rem] flex flex-col justify-center" },
                            react_1["default"].createElement("span", { className: "absolute w-[calc(100%-2.5rem)] h-[calc(100%-2.5rem)] top-0 end-0 border-t-2 border-black \r\n                            before:absolute before:content-[''] before:w-[3rem] before:h-[3rem] before:border-b-2 before:border-black before:border-l-2 before:rounded-bl-[1.75rem] before:-start-[calc(2.5rem+2px)] before:-top-[3rem]" }),
                            react_1["default"].createElement("span", { className: "absolute w-[calc(100%+2.5rem)] h-[calc(100%-1.5rem)] bottom-0 -start-[2px] border-b-2 border-l-2 border-black rounded-bl-[1.75rem]" }),
                            react_1["default"].createElement("h3", { className: "text-5xl mb-3 font-hind font-bold" }, "52+"),
                            react_1["default"].createElement("p", { className: 'font-unbounded text-black/50 font-semibold text-xs' }, "Happy Customer"))),
                    react_1["default"].createElement("div", { className: 'mt-[3rem]' },
                        react_1["default"].createElement("div", { className: "relative h-[8rem] flex flex-col justify-center" },
                            react_1["default"].createElement("span", { className: "absolute w-full h-[calc(100%-2.5rem)] top-0 end-[2.5rem] border-t-2 border-black" }),
                            react_1["default"].createElement("span", { className: "absolute w-full h-[calc(100%-1.5rem)] bottom-0 -start-[2px] border-b-2 border-black border-r-2 rounded-br-[1.75rem]\r\n                            after:absolute after:content-[''] after:w-[2px] after:h-[calc(100%-1.5rem)]  after:bg-black after:start-[2px] after:bottom-[1.5rem]\r\n                            before:absolute before:content-[''] before:w-[2.5rem] before:h-[3rem] before:border-b-2 before:border-black before:border-r-2 before:rounded-br-[1.75rem] before:-end-[4px] before:-top-[calc(4.5rem-2px)]\r\n                            " }),
                            react_1["default"].createElement("h3", { className: "text-5xl mb-3 font-hind font-bold" }, "9.2M"),
                            react_1["default"].createElement("p", { className: 'font-unbounded text-black/50 font-semibold text-xs' }, "Happy Customer"))),
                    react_1["default"].createElement("div", { className: '-mt-[5rem]' },
                        react_1["default"].createElement("div", { className: "relative h-[8rem] flex flex-col justify-center" },
                            react_1["default"].createElement("span", { className: "absolute w-[calc(100%-2.5rem)] h-[calc(100%-2.5rem)] top-0 -start-[2px] border-t-2 border-l-2 border-black rounded-tl-[1.75rem] \r\n                            before:absolute before:content-[''] before:w-[3rem] before:h-[3rem] before:border-b-2 before:border-black before:border-r-2 before:rounded-br-[1.75rem] before:-end-[calc(2.5rem+2px)] before:-top-[3rem]\r\n                            " }),
                            react_1["default"].createElement("span", { className: "absolute w-[calc(100%-2.5rem)] h-[calc(100%-1.5rem)] bottom-0 end-[2px] border-b-2 border-r-2 border-black rounded-br-[1.75rem]\r\n                            before:absolute before:content-[''] before:w-[3rem] before:h-[3rem] before:border-t-2 before:border-black before:border-l-2 before:rounded-tl-[1.75rem] before:-start-[calc(2.5rem+2px)] before:-bottom-[3rem]\r\n                            " }),
                            react_1["default"].createElement("h3", { className: "text-5xl mb-3 font-hind font-bold" }, "89%"),
                            react_1["default"].createElement("p", { className: 'font-unbounded text-black/50 font-semibold text-xs' }, "Happy Customer"))))))));
};
exports["default"] = Hero;
