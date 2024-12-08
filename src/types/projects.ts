import { PostTagProps, PostCategoryProps } from "./global";

export interface ProjectPostProps {
    id: number;
    title: string;
    excerpt: string;
    content?: string;
    link: string;
    preview_link: string;
    categories?: PostCategoryProps[];
    tags?: PostTagProps[];
    featured_image?: string | null;
    date: Date;
}

export interface ProjectsListDataProps {
    current_page: number;
    total_pages: number;
    posts: ProjectPostProps[];
}

export interface SingleProjectPostProps {
    project: ProjectPostProps;
}
