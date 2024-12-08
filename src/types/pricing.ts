import { PostCategoryProps, PostTagProps } from "./global";

export interface ProjectProps {
    label: string;
    value: string;
}

export interface ReviewProps {
    id?: number;
    title: string;
    excerpt: string;
    content: string;
    featured_image?: string | null;
    date: Date;
    author_bio?: string;
    review_from?: string | null;
    star_rating: number;
}

export interface PricingPostProps {
    id: number;
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
    color?: string;
    price?: number;
    label?: string;
    info?: string;
    features?: string[];
    projects?: ProjectProps[];
    reviews?: ReviewProps[];
    order_link?: string;
}

// Overall response type
export type PricingListDataProps = PricingPostProps[];

export interface SingleServiceProps {
    post?: PricingPostProps;
}
