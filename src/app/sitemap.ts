import { Config } from '@/lib/config';
import { BlogPostsProps } from '@/types/blogs';
import type { MetadataRoute } from 'next';

const WEBSITE_HOST_URL = process.env.siteURL || 'https://www.webdeveloperarif.com';
const API_URL = process.env.apiURL;

type ChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const response = await fetch(`${API_URL}/blogs`);

  if (!response.ok) {
    console.error('Failed to fetch blogs:', response.statusText);
    return [];
  }

  // Use BlogsListDataProps to type the response
  const data = await response.json();
  const changeFrequency: ChangeFrequency = 'daily'; // Specify a default or specific value

  const posts = data?.blogs?.map((blog: BlogPostsProps) => {
    // Ensure lastModified is in the correct ISO 8601 format
    const lastModified = new Date(blog.date).toISOString();

    return {
      url: `${WEBSITE_HOST_URL}${Config.cleanBlogURL(blog.link)}`,
      lastModified,
      changeFrequency,
    };
  }) || [];

  const routes = ['', '/projects', '/blogs', '/tools', '/contact', '/pricing'].map((route) => ({
    url: `${WEBSITE_HOST_URL}${route}`,
    lastModified: new Date().toISOString(), // Ensure this is also formatted correctly
    changeFrequency,
  }));

  return [...routes, ...posts];
}
