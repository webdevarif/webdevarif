import { PostCategoryProps, PostTagProps } from "./global";

export interface ToolPostProps {
    id:  number;
    title: string;
    excerpt: string;
    content?: string;
    slug: string;
    link: string;
    categories?: PostCategoryProps[];
    tags?: PostTagProps[];
    featured_image?: string | null;
    date: Date;
}

// Structure for each element in the response array
export interface ToolsByCategory {
  name: string;
  slug: string;
  tools: ToolPostProps[];
}


// Overall response type
export type ToolListDataProps = ToolsByCategory[];
  
export interface SingleToolPostProps {
  post?: ToolPostProps;
}
  