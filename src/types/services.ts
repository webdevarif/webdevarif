import { PostCategoryProps, PostTagProps } from "./global";

export interface ServicePostProps {
    id:  number;
    title: string;
    excerpt: string;
    content?: string;
    link: string;
    slug: string;
    categories?: PostCategoryProps[];
    tags?: PostTagProps[];
    featured_image?: string | null;
    icon?: string | null;
    date: Date;
}

// Overall response type
export type ServiceListDataProps = ServicePostProps[];
  
export interface SingleServiceProps {
  post?: ServicePostProps;
}
  