export class Config {

    /**
     * Replaces the base URL in a given URL string with an empty string.
     * Useful for transforming full URLs to relative paths.
     * 
     * @param {string} url - The URL to be transformed.
     * @returns {string} The transformed URL with the base URL removed, or the original URL if the base URL is not set.
     */
    static cleanBlogURL(url: string): string {
        const wpBaseUrl = process.env.baseURL;

        // Check if wpBaseUrl is undefined and handle accordingly
        if (!wpBaseUrl) {
            console.warn("Environment variable NEXT_PUBLIC_WP_BASE_URL is not set.");
            return url;  // Return the original URL if no base URL is available
        }

        // Perform replacement of the base URL with an empty string
        return url.replace(wpBaseUrl, '/blog');
    }

    static projectCategoryClass(name: string): string {

        // Check if wpBaseUrl is undefined and handle accordingly
        if (name == 'Shopify') {
            return 'bg-[#15803d] text-white ring-[#15803d]';  // Return the original URL if no base URL is available
        }
        if (name == 'WordPress') {
            return 'bg-[#3859E9] text-white ring-[#3859E9]';  // Return the original URL if no base URL is available
        }
        if (name == 'Bootstrap') {
            return 'bg-[#760FF0] text-white ring-[#760FF0]';  // Return the original URL if no base URL is available
        }

        // Perform replacement of the base URL with an empty string
        return 'bg-gray-50 text-gray-600 ring-gray-500/10';
    }
}
