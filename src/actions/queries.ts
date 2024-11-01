import useSWR from "swr";
import { GlobalSettingsProps } from "@/types/global";
import { BlogsListDataProps, SingleBlogPostProps } from "@/types/blogs";
import { ProjectsListDataProps, SingleProjectPostProps } from "@/types/projects";

/*************************************************************
 * START: THEME CUSTOM HOOKS
 *************************************************************/ 
export const useGlobalSettings = () => {
  const url = `${process.env.apiURL}/global-settings`;
  return useSWR<GlobalSettingsProps>(url);
};
/*************************************************************
 * END: THEME CUSTOM HOOKS
 *************************************************************/ 

/*************************************************************
 * START: BLOG CUSTOM HOOKS
 *************************************************************/
export const useBlogs = (query?: string) => {
  const url = `${process.env.apiURL}/blogs?${query}`;
  return useSWR<BlogsListDataProps>(url);
};

export const useBlogPost = (slug: string) => {
  const url = `${process.env.apiURL}/blog/${slug}`;
  return useSWR<SingleBlogPostProps>(url);
};
/*************************************************************
 * END: BLOG CUSTOM HOOKS
 *************************************************************/

/*************************************************************
 * START: PROJECT CUSTOM HOOKS
 *************************************************************/
export const useProjects = (query?: string) => {
  const url = `${process.env.apiURL}/projects?${query}`;
  return useSWR<ProjectsListDataProps>(url);
};

export const useProjectPost = (slug: string) => {
  const url = `${process.env.apiURL}/project/${slug}`;
  return useSWR<SingleProjectPostProps>(url);
};
/*************************************************************
 * END: PROJECT CUSTOM HOOKS
 *************************************************************/
