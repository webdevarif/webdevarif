"use strict";
exports.__esModule = true;
var react_1 = require("react");
var author_png_1 = require("./images/author.png");
var link_1 = require("next/link");
var image_1 = require("next/image");
var button_1 = require("@/components/ui/button");
var tb_1 = require("react-icons/tb");
var AboutMe = function () {
    return (react_1["default"].createElement("section", { className: 'bg-slate-50 py-[100px] relative', id: 'section-about' },
        react_1["default"].createElement("div", { className: "container max-w-[60rem]" },
            react_1["default"].createElement("div", { className: "grid grid-cols-[1fr_18rem] gap-x-8 items-center" },
                react_1["default"].createElement("div", { className: '' },
                    react_1["default"].createElement("h3", { className: "text-lg font-unbounded uppercase mb-4" }, " I'm Arif Hossin | Full Stack Developer "),
                    react_1["default"].createElement("div", { className: "space-y-4" },
                        react_1["default"].createElement("p", null, "With over 7 years as a Full Stack Developer, I specialize in building user-focused, high-performing websites. At Digital Farmers, I create responsive applications using React, Next.js, and Django, with expertise in Shopify Plus, WooCommerce, and WordPress, enabling tailored solutions that exceed client expectations. My Marketing degree enhances my focus on UX and engagement."),
                        react_1["default"].createElement("p", null, "With 500+ projects completed on Upwork and Fiverr, I\u2019ve honed skills in e-commerce and theme customization. I\u2019m dedicated to delivering impactful digital experiences that drive results.")),
                    react_1["default"].createElement("div", { className: 'mt-6' },
                        react_1["default"].createElement("span", { className: "inline-block relative z-10 before:transition-all before:duration-300 before:ease-linear before:content-[''] before:w-full before:h-full before:bg-black before:absolute before:-end-[0.35rem] before:z-[-1] before:translate-y-[0.35rem] hover:before:end-0 hover:before:translate-y-0" },
                            react_1["default"].createElement(button_1.Button, { variant: 'outline', asChild: true },
                                react_1["default"].createElement(link_1["default"], { href: "/schedule", className: 'inline-flex items-center gap-2 h-[3.25rem] min-w-[10rem] uppercase font-unbounded text-sm' },
                                    react_1["default"].createElement("span", null, "Hire Me"),
                                    react_1["default"].createElement(tb_1.TbHeartHandshake, { className: 'w-5 h-5' })))))),
                react_1["default"].createElement("div", { className: 'bg-white border-2 border-black w-full min-h-[25rem] h-[35vh] relative before:transition-all before:duration-300 before:ease-linear before:content-[""] before:w-full before:h-full before:bg-black group/item before:absolute before:z-[-1] before:-end-[0.5rem] before:translate-y-[0.5rem]' },
                    react_1["default"].createElement(image_1["default"], { src: author_png_1["default"], alt: "Ventix", className: 'mx-auto h-full w-full object-cover object-[top_center]' }))))));
};
exports["default"] = AboutMe;
