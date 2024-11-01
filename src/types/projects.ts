import { PostTagProps } from "./global";

export interface ProjectCategoryProps {
  name: string;
}

export interface ProjectPostProps {
    id: number;
    title: string;
    excerpt: string;
    content?: string;
    link: string;
    preview_link: string;
    project_categories?: ProjectCategoryProps[];
    tags?: PostTagProps[];
    featured_image?: string | null;
    date: Date;
}

export interface ProjectsListDataProps {
    current_page: number;
    total_pages: number;
    projects: ProjectPostProps[];
}

export interface SingleProjectPostProps {
    project: ProjectPostProps;
}
