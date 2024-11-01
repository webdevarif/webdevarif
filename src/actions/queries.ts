import useSWR from "swr";
import { GlobalSettingsProps } from "@/types/global";
import { BlogsListDataProps, SingleBlogPostProps } from "@/types/blogs";
import { ProjectsListDataProps, SingleProjectPostProps } from "@/types/projects";

/*************************************************************
 * START: THEME QUERIES
 *************************************************************/ 
export const themeQueries = {
  // Get All Settings
  getSettings: () => {
    const url = `${process.env.apiURL}/global-settings`;
    return useSWR<GlobalSettingsProps>(url);
  },
};
/*************************************************************
 * END: THEME QUERIES
 *************************************************************/ 



/*************************************************************
 * START: BLOG QUERIES
 *************************************************************/
export const blogQueries = {
  // Get Blogs with dynamic query support
  getBlogs: (query?: string) => {
    const url = `${process.env.apiURL}/blogs?${query}`;
    return useSWR<BlogsListDataProps>(url);
  },
  // Get Blogs with dynamic query support
  getBlogPost: (slug: string) => {
    const url = `${process.env.apiURL}/blog/${slug}`;
    return useSWR<SingleBlogPostProps>(url);
  },
};
/*************************************************************
 * END: BLOG QUERIES
 *************************************************************/


/*************************************************************
 * START: BLOG QUERIES
 *************************************************************/
export const projectQueries = {
  // Get Projects with dynamic query support
  getPosts: (query?: string) => {
    const url = `${process.env.apiURL}/projects?${query}`;
    return useSWR<ProjectsListDataProps>(url);
  },
  // Get Project with dynamic query support
  getProjectPost: (slug: string) => {
    const url = `${process.env.apiURL}/project/${slug}`;
    return useSWR<SingleProjectPostProps>(url);
  },
};
/*************************************************************
 * END: BLOG QUERIES
 *************************************************************/


