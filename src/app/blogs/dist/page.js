"use client";
"use strict";
exports.__esModule = true;
var queries_1 = require("@/actions/queries");
var CustomPagination_1 = require("@/components/CustomPagination");
var PageLayout_1 = require("@/layouts/PageLayout");
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var CardBlogPost_1 = require("@/components/Card/CardBlogPost");
var BlogPage = function () {
    var router = navigation_1.useRouter();
    var searchParams = navigation_1.useSearchParams();
    var _a = react_1.useState(function () {
        var pageParam = searchParams.get('page');
        return pageParam ? parseInt(pageParam) : 1;
    }), pageIndex = _a[0], setPageIndex = _a[1];
    var _b = queries_1.blogQueries.getBlogs("current-page=" + pageIndex + "&per-page=15"), data = _b.data, isLoading = _b.isLoading;
    react_1.useEffect(function () {
        var pageParam = searchParams.get('page');
        if (pageParam && pageParam !== pageIndex.toString()) {
            setPageIndex(parseInt(pageParam));
        }
    }, [searchParams]);
    var changePage = function (newPage) {
        setPageIndex(newPage);
        var searchParams = new URLSearchParams();
        searchParams.set('page', newPage.toString());
        router.push("/blogs?" + searchParams.toString());
    };
    return (react_1["default"].createElement(PageLayout_1["default"], null,
        react_1["default"].createElement("div", { className: "py-[100px] text-center" },
            react_1["default"].createElement("div", { className: "container" },
                react_1["default"].createElement("h5", { className: "font-unbounded text-5xl font-semibold uppercase" }, "Blog Insight"))),
        react_1["default"].createElement("div", { className: "container pb-6 space-y-10" },
            react_1["default"].createElement("div", { className: "grid grid-cols-3 gap-6" }, isLoading ? "Loading..." :
                data && data.blogs.map(function (blog, index) { return (react_1["default"].createElement(CardBlogPost_1["default"], { key: blog.id, post: blog })); })),
            data && data.total_pages > 1 &&
                react_1["default"].createElement(CustomPagination_1["default"], { currentPage: pageIndex, totalPages: Number(data === null || data === void 0 ? void 0 : data.total_pages), setPage: changePage }))));
};
exports["default"] = BlogPage;
