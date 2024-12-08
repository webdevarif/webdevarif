import { PostCategoryProps, PostTagProps } from "./global";

export interface PostDataProps {
    id:  number;
    title: string;
    excerpt: string;
    content?: string;
    link: string;
    slug: string;
    author?: string;
    categories?: PostCategoryProps[];
    tags?: PostTagProps[];
    featured_image?: string | null;
    icon?: string | null;
    date: Date;
}

export interface PostListDataProps {
    current_page:  number;
    total_pages:  number;
    posts: PostDataProps[];
  }

  
export interface SinglePostProps {
  post?: PostDataProps;
  related_posts?: PostDataProps[];
}
  