// utils/fetcher.ts
import axios from "axios";

// Create a pre-configured instance of axios with a base URL
export const axiosInstance = axios.create({
  baseURL: process.env.apiUrl,
});

// Define a fetcher function that supports custom headers
const fetcher = async (url: string) => {
  try {
    
    // // Add Authorization header with Bearer token if accessToken exists
    // const headers = {
    //   Authorization: accessToken ? `Bearer ${accessToken}` : '',
    //   'Content-Type': 'application/json'
    // };

    // // Make a GET request with the configured headers
    // const response = await axiosInstance.get(url, { headers });

    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    // Check if the error is an HTTP error with a response
    if (axios.isAxiosError(error) && error.response) {
      // Return JSON object for error response
      return {
        status: error.response.status,
        message: error.response.statusText || "An error occurred",
        data: error.response.data || {},
      };
    }
    // For network or other unexpected errors
    return {
      status: 500,
      message: "Network Error or Unexpected Issue",
      data: {},
    };
  }
};

export default fetcher;
