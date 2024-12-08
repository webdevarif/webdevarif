import { PostCategoryProps, PostTagProps } from "./global";

export interface BlogPostsProps {
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
    date: Date;
}

export interface BlogsListDataProps {
    current_page:  number;
    total_pages:  number;
    blogs: BlogPostsProps[];
  }

  
export interface SingleBlogPostProps {
  post?: BlogPostsProps;
  related_posts?: BlogPostsProps[];
}
  