"use strict";
exports.__esModule = true;
exports.projectQueries = exports.blogQueries = exports.themeQueries = void 0;
var swr_1 = require("swr");
/*************************************************************
 * START: THEME QUERIES
 *************************************************************/
exports.themeQueries = {
    // Get All Settings
    getSettings: function () {
        var url = process.env.apiURL + "/global-settings";
        return swr_1["default"](url);
    }
};
/*************************************************************
 * END: THEME QUERIES
 *************************************************************/
/*************************************************************
 * START: BLOG QUERIES
 *************************************************************/
exports.blogQueries = {
    // Get Blogs with dynamic query support
    getBlogs: function (query) {
        var url = process.env.apiURL + "/blogs?" + query;
        return swr_1["default"](url);
    },
    // Get Blogs with dynamic query support
    getBlogPost: function (slug) {
        var url = process.env.apiURL + "/blog/" + slug;
        return swr_1["default"](url);
    }
};
/*************************************************************
 * END: BLOG QUERIES
 *************************************************************/
/*************************************************************
 * START: BLOG QUERIES
 *************************************************************/
exports.projectQueries = {
    // Get Projects with dynamic query support
    getPosts: function (query) {
        var url = process.env.apiURL + "/projects?" + query;
        return swr_1["default"](url);
    },
    // Get Project with dynamic query support
    getProjectPost: function (slug) {
        var url = process.env.apiURL + "/project/" + slug;
        return swr_1["default"](url);
    }
};
/*************************************************************
 * END: BLOG QUERIES
 *************************************************************/
