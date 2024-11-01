"use strict";
exports.__esModule = true;
var react_1 = require("react");
var pagination_1 = require("@/components/ui/pagination");
var CustomPagination = function (_a) {
    var currentPage = _a.currentPage, totalPages = _a.totalPages, setPage = _a.setPage;
    var handlePreviousClick = function () {
        if (currentPage > 1) {
            setPage(currentPage - 1);
        }
    };
    var handleNextClick = function () {
        if (currentPage < totalPages) {
            setPage(currentPage + 1);
        }
    };
    return (react_1["default"].createElement(pagination_1.Pagination, null,
        react_1["default"].createElement(pagination_1.PaginationContent, null,
            react_1["default"].createElement(pagination_1.PaginationItem, null,
                react_1["default"].createElement(pagination_1.PaginationPrevious, { className: "uppercase font-unbounded rounded-none " + (currentPage === 1 ? 'opacity-25 pointer-events-none' : 'cursor-pointer'), onClick: handlePreviousClick })),
            react_1["default"].createElement(pagination_1.PaginationItem, null,
                react_1["default"].createElement(pagination_1.PaginationNext, { className: "uppercase font-unbounded rounded-none " + (currentPage === totalPages ? 'opacity-25 pointer-events-none' : 'cursor-pointer'), onClick: handleNextClick })))));
};
exports["default"] = CustomPagination;
