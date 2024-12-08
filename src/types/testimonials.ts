export interface ProjectProps {
    label: string;
    value: string;
}

export interface TestimonialPostProps {
    id: number;
    title: string;
    excerpt: string;
    content?: string | TrustedHTML;
    link: string;
    slug: string;
    featured_image?: string | null;
    author_bio?: string;
    date: Date;
    project?: ProjectProps[];
    review_from?: string;
    star_rating: number | string;
}

// Overall response type
export type TestimonialListDataProps = TestimonialPostProps[];

export interface SingleServiceProps {
    post?: TestimonialPostProps;
}
