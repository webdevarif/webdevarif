import useSWR from "swr";
import { GlobalSettingsProps } from "@/types/global";
import { ProjectsListDataProps, SingleProjectPostProps } from "@/types/projects";
import { SingleToolPostProps, ToolListDataProps } from "@/types/tools";
import { PostListDataProps, SinglePostProps } from "@/types/post";
import { ServiceListDataProps, SingleServiceProps } from "@/types/services";
import { PricingListDataProps } from "@/types/pricing";
import { TestimonialListDataProps } from "@/types/testimonials";

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
  return useSWR<PostListDataProps>(url);
};

export const useBlogPost = (slug: string) => {
  const url = `${process.env.apiURL}/blogs/${slug}`;
  return useSWR<SinglePostProps>(url);
};
/*************************************************************
 * END: BLOG CUSTOM HOOKS
 *************************************************************/

/*************************************************************
 * START: SERVICE CUSTOM HOOKS
 *************************************************************/
export const useServices = (query?: string) => {
  const url = `${process.env.apiURL}/services?${query}`;
  return useSWR<ServiceListDataProps>(url);
};

export const useSingleService = (slug: string) => {
  const url = `${process.env.apiURL}/services/${slug}`;
  return useSWR<SingleServiceProps>(url);
};
/*************************************************************
 * END: SERVICE CUSTOM HOOKS
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

/*************************************************************
 * START: TOOL CUSTOM HOOKS
 *************************************************************/
export const useTools = (query?: string) => {
  const url = `${process.env.apiURL}/tools?${query}`;
  return useSWR<ToolListDataProps>(url);
};

export const useSingleTool = (slug: string) => {
  const url = `${process.env.apiURL}/tools/${slug}`;
  return useSWR<SingleToolPostProps>(url);
};
/*************************************************************
 * END: TOOL CUSTOM HOOKS
 *************************************************************/

/*************************************************************
 * START: PRICING CUSTOM HOOKS
 *************************************************************/
export const usePricing = (query?: string) => {
  const url = `${process.env.apiURL}/pricing?${query}`;
  return useSWR<PricingListDataProps>(url);
};
/*************************************************************
 * END: PRICING CUSTOM HOOKS
 *************************************************************/

/*************************************************************
 * START: TESTIMONIALS CUSTOM HOOKS
 *************************************************************/
export const useTestimonials = (query?: string) => {
  const url = `${process.env.apiURL}/testimonials?${query}`;
  return useSWR<TestimonialListDataProps>(url);
};
/*************************************************************
 * END: TESTIMONIALS CUSTOM HOOKS
 *************************************************************/
