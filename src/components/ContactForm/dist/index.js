"use client";
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var react_1 = require("react");
// Make sure to run npm install @formspree/react
// For more help visit https://formspr.ee/react-help
var react_2 = require("@formspree/react");
var input_1 = require("@/components/ui/input");
var textarea_1 = require("@/components/ui/textarea");
var react_label_1 = require("@radix-ui/react-label");
var button_1 = require("@/components/ui/button");
var calendar_1 = require("@/components/ui/calendar");
var form_1 = require("@/components/ui/form");
var zod_1 = require("@hookform/resolvers/zod");
var date_fns_1 = require("date-fns");
var react_hook_form_1 = require("react-hook-form");
var zod_2 = require("zod");
var wordpress_png_1 = require("./images/wordpress.png");
var Woocommerce_png_1 = require("./images/Woocommerce.png");
var Shopify_png_1 = require("./images/Shopify.png");
var NextJs_png_1 = require("./images/NextJs.png");
var tailwind_png_1 = require("./images/tailwind.png");
var Bootstrap_png_1 = require("./images/Bootstrap.png");
var popover_1 = require("@/components/ui/popover");
// Define your schema with Zod
var FormSchema = zod_2.z.object({
    full_name: zod_2.z.string().min(2).max(50),
    email: zod_2.z.string().email(),
    skype_whatsapp: zod_2.z.string(),
    phone: zod_2.z.string(),
    meeting_date: zod_2.z.string().refine(function (date) {
        return !isNaN(Date.parse(date));
    }, {
        message: "Invalid date format"
    }),
    services: zod_2.z.string().min(5, { message: "Service is required." }),
    message: zod_2.z.string().min(5, { message: "Message is required." })
});
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var image_1 = require("next/image");
var ContactForm = function () {
    var form = react_hook_form_1.useForm({
        resolver: zod_1.zodResolver(FormSchema),
        defaultValues: {
            full_name: '',
            email: '',
            skype_whatsapp: '',
            phone: '',
            meeting_date: new Date().toISOString(),
            services: '',
            message: ''
        }
    });
    var onSubmit = function (data) {
        // Convert the date string back to a Date object if needed
        var meeting_date = new Date(data.meeting_date);
        // console.log(meeting_date, data);
    };
    var _a = react_2.useForm("xvoenwrq"), state = _a[0], handleSubmit = _a[1];
    if (state.succeeded) {
        return react_1["default"].createElement("p", null, "Thanks for joining!");
    }
    var services = [
        {
            heading: 'Wordpress',
            thumbnail: wordpress_png_1["default"],
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
        {
            heading: 'Woocommerce',
            thumbnail: Woocommerce_png_1["default"],
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
        {
            heading: 'Shopify',
            thumbnail: Shopify_png_1["default"],
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
        {
            heading: 'NextJs',
            thumbnail: NextJs_png_1["default"],
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
        {
            heading: 'Html/Tailwind',
            thumbnail: tailwind_png_1["default"],
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
        {
            heading: 'Html/Bootstrap',
            thumbnail: Bootstrap_png_1["default"],
            list: [
                { text: 'Custom Theme Development' },
                { text: 'Existing Theme/Plugin Modification' },
                { text: 'Theme/Plugins Bug Fixing' },
                { text: 'Responsive Design' },
                { text: 'SEO, Speed Optimization' },
            ]
        },
    ];
    return (react_1["default"].createElement("section", { className: 'contact-area bg-slate-50 py-[100px]' },
        react_1["default"].createElement("div", { className: "container" },
            react_1["default"].createElement("div", { className: "mb-[5rem]" },
                react_1["default"].createElement("h2", { className: "text-[40px] font-bold font-unbounded uppercase leading-[1.2] mb-4" },
                    "Need help with ",
                    react_1["default"].createElement("br", null),
                    "something in specific?")),
            react_1["default"].createElement("div", { className: "" },
                react_1["default"].createElement(form_1.Form, __assign({}, form),
                    react_1["default"].createElement("form", { onSubmit: form.handleSubmit(function (data) {
                            onSubmit(data);
                            handleSubmit(data); // Integrating with Formspree
                        }) },
                        react_1["default"].createElement("div", { className: "grid grid-cols-2 gap-8" },
                            react_1["default"].createElement("div", { className: "col-span-1 md:order-last" },
                                react_1["default"].createElement("div", { className: "" },
                                    react_1["default"].createElement(form_1.FormLabel, { className: 'block font-hind mb-4 font-semibold uppercase' }, "What service you want?"),
                                    react_1["default"].createElement("div", { className: "grid grid-cols-3 gap-6" }, services.map(function (service, index) { return (react_1["default"].createElement(form_1.FormField, { key: index, control: form.control, name: "services", render: function (_a) {
                                            var field = _a.field;
                                            return (react_1["default"].createElement(form_1.FormItem, null,
                                                react_1["default"].createElement("div", { className: "form-check [&>.form-check-input:checked~.form-check-label]:border-black [&>.form-check-input:checked~.form-check-label>.svg-check]:opacity-100 [&>.form-check-input:checked~.form-check-label>.svg-check]:scale-100" },
                                                    react_1["default"].createElement(input_1.Input, __assign({}, field, { value: service.heading, type: 'radio', id: "form--id--" + index, className: 'form-check-input hidden', onChange: function () {
                                                            field.onChange(service.heading);
                                                        } })),
                                                    react_1["default"].createElement(react_label_1.Label, { htmlFor: "form--id--" + index, className: "form-check-label cursor-hover relative py-[15px] px-[10px] rounded-none border-2 cursor-pointer border-black/5 transition-all duration-300 bg-center bg-cover flex flex-col justify-center aspect-square bg-white" },
                                                        react_1["default"].createElement("svg", { className: 'w-8 h-8 svg-check duration-300 ease-linear transition-all absolute top-0 end-0 opacity-0 scale-50', stroke: "currentColor", fill: "currentColor", strokeWidth: "0", viewBox: "0 0 512 512", height: "1em", width: "1em", xmlns: "http://www.w3.org/2000/svg" },
                                                            react_1["default"].createElement("path", { d: "M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm108.25 138.29-134.4 160a16 16 0 0 1-12 5.71h-.27a16 16 0 0 1-11.89-5.3l-57.6-64a16 16 0 1 1 23.78-21.4l45.29 50.32 122.59-145.91a16 16 0 0 1 24.5 20.58z" })),
                                                        react_1["default"].createElement("div", { className: "mb-3 text-center" },
                                                            react_1["default"].createElement("span", { className: "mx-auto h-[55px] w-[55px] min-w-[55px] rounded-full overflow-hidden bg-white bg-opacity-10 inline-block" }, service.thumbnail ?
                                                                react_1["default"].createElement(image_1["default"], { src: service.thumbnail, className: 'w-full h-full object-cover', alt: service.heading }) :
                                                                react_1["default"].createElement(image_1["default"], { src: wordpress_png_1["default"], className: 'w-full h-full object-cover', alt: service.heading }))),
                                                        react_1["default"].createElement("h2", { className: "text-center font-optima-pro font-semibold text-xs uppercase tracking-widest" }, service.heading)))));
                                        } })); })))),
                            react_1["default"].createElement("div", { className: "col-span-1 space-y-6" },
                                react_1["default"].createElement("div", { className: "grid grid-cols-2 gap-4" },
                                    react_1["default"].createElement(form_1.FormField, { control: form.control, name: "full_name", render: function (_a) {
                                            var field = _a.field;
                                            return (react_1["default"].createElement(form_1.FormItem, null,
                                                react_1["default"].createElement(form_1.FormLabel, { className: 'block font-hind mb-4 font-semibold uppercase' }, "Full Name"),
                                                react_1["default"].createElement(form_1.FormControl, null,
                                                    react_1["default"].createElement(input_1.Input, __assign({ placeholder: "Full Name" }, field))),
                                                react_1["default"].createElement(form_1.FormMessage, null)));
                                        } }),
                                    react_1["default"].createElement(form_1.FormField, { control: form.control, name: "email", render: function (_a) {
                                            var field = _a.field;
                                            return (react_1["default"].createElement(form_1.FormItem, null,
                                                react_1["default"].createElement(form_1.FormLabel, { className: 'block font-hind mb-4 font-semibold uppercase' }, "Email"),
                                                react_1["default"].createElement(form_1.FormControl, null,
                                                    react_1["default"].createElement(input_1.Input, __assign({ type: 'email', placeholder: "Email" }, field))),
                                                react_1["default"].createElement(form_1.FormDescription, { className: 'text-xs' }, "We will use this email to contact you."),
                                                react_1["default"].createElement(form_1.FormMessage, null)));
                                        } })),
                                react_1["default"].createElement("div", { className: "grid grid-cols-2 gap-[20px]" },
                                    react_1["default"].createElement(form_1.FormField, { control: form.control, name: "skype_whatsapp", render: function (_a) {
                                            var field = _a.field;
                                            return (react_1["default"].createElement(form_1.FormItem, null,
                                                react_1["default"].createElement(form_1.FormLabel, { className: 'block font-hind mb-4 font-semibold uppercase' }, "Skype/Whatsapp"),
                                                react_1["default"].createElement(form_1.FormControl, null,
                                                    react_1["default"].createElement(input_1.Input, __assign({ placeholder: "xxx xxxx xxxx" }, field))),
                                                react_1["default"].createElement(form_1.FormMessage, null)));
                                        } }),
                                    react_1["default"].createElement(form_1.FormField, { control: form.control, name: "phone", render: function (_a) {
                                            var field = _a.field;
                                            return (react_1["default"].createElement(form_1.FormItem, null,
                                                react_1["default"].createElement(form_1.FormLabel, { className: 'block font-hind mb-4 font-semibold uppercase' }, "Phone"),
                                                react_1["default"].createElement(form_1.FormControl, null,
                                                    react_1["default"].createElement(input_1.Input, __assign({ type: 'text', placeholder: "xxx xxxx xxxxx" }, field))),
                                                react_1["default"].createElement(form_1.FormMessage, null)));
                                        } })),
                                react_1["default"].createElement(form_1.FormField, { control: form.control, name: "meeting_date", render: function (_a) {
                                        var field = _a.field;
                                        return (react_1["default"].createElement(form_1.FormItem, { className: "flex flex-col" },
                                            react_1["default"].createElement(form_1.FormLabel, { className: 'block font-hind mb-4 font-semibold uppercase' }, "Please select best time for a meeting:"),
                                            react_1["default"].createElement(popover_1.Popover, null,
                                                react_1["default"].createElement(popover_1.PopoverTrigger, { asChild: true },
                                                    react_1["default"].createElement(form_1.FormControl, null,
                                                        react_1["default"].createElement(button_1.Button, { variant: "outline", className: utils_1.cn("w-full h-[50px] px-6 pe-4 py-2 text-sm text-left font-normal rounded-none border-2 border-black bg-background hover:bg-background hover:text-black", !field.value && "text-muted-foreground") },
                                                            field.value ? (date_fns_1.format(new Date(field.value), "PPP")) : (react_1["default"].createElement("span", null, "Pick a date")),
                                                            react_1["default"].createElement(lucide_react_1.CalendarClock, { className: "ml-auto h-6 w-6 opacity-50" })))),
                                                react_1["default"].createElement(popover_1.PopoverContent, { className: "w-auto p-0", align: "start" },
                                                    react_1["default"].createElement(calendar_1.Calendar, { mode: "single", selected: field.value ? new Date(field.value) : undefined, onSelect: function (date) { return field.onChange(date === null || date === void 0 ? void 0 : date.toISOString()); }, disabled: function (date) {
                                                            return date < new Date() || date < new Date("1900-01-01");
                                                        }, className: 'bg-white text-black', initialFocus: true }))),
                                            react_1["default"].createElement(form_1.FormDescription, null, "Your date of birth is used to calculate your age."),
                                            react_1["default"].createElement(form_1.FormMessage, null)));
                                    } }),
                                react_1["default"].createElement(form_1.FormField, { control: form.control, name: "message", render: function (_a) {
                                        var field = _a.field;
                                        return (react_1["default"].createElement(form_1.FormItem, null,
                                            react_1["default"].createElement(form_1.FormLabel, { className: 'block font-hind mb-4 font-semibold uppercase' }, "Tell us more"),
                                            react_1["default"].createElement(form_1.FormControl, null,
                                                react_1["default"].createElement(textarea_1.Textarea, __assign({ placeholder: "Tell us more.." }, field))),
                                            react_1["default"].createElement(form_1.FormMessage, null)));
                                    } }),
                                react_1["default"].createElement(button_1.Button, { type: "submit", className: 'min-w-[8rem] text-md uppercase h-auto py-3 max-w-full' }, "Submit")))))))));
};
exports["default"] = ContactForm;
