/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['admin.webdevarif.com', 'via.placeholder.com'],
    },
    env: {
        baseURL: process.env.NEXT_PUBLIC_WP_BASE_URL,
        apiURL: process.env.NEXT_PUBLIC_WP_BASE_API_URL,
        siteURL: process.env.NEXT_PUBLIC_SITE_URL,
    },
};

export default nextConfig;


