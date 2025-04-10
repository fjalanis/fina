import { getEnvVar } from '../utils/env';

const API_BASE_URL = getEnvVar('FRONTEND_API_URL');

// Generic fetch function with error handling
// Export this function directly for use in service files
export const fetchData = async (endpoint, options = {}) => {
  const baseUrl = API_BASE_URL;
  const url = `${baseUrl}${endpoint}`;

  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Attempt to parse JSON, but handle cases where response might be empty (e.g., 204 No Content)
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log('API response data:', data);
    } else if (response.ok && response.status !== 204) {
        // Handle other content types or non-empty responses if needed
        // data = await response.text(); // Example: get text
        console.log('API response: Non-JSON content type received.');
    }


    if (!response.ok) {
      // Improved error handling - extract server error message if available
      // Use data if it was parsed, otherwise use statusText
      const errorMessage = data?.error || data?.message || `HTTP Error: ${response.status} ${response.statusText}`;
      console.error('API Error:', {
        status: response.status,
        message: errorMessage,
        data // Log the data even on error for debugging
      });
      // Throw an error object that includes the status and potential data
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    // Return data (which might be null for 204 or non-JSON responses)
    return data;
  } catch (error) {
    // Log the error originating from fetch/json parsing or the re-thrown error from above
    console.error('API Fetch/Processing Error:', {
      message: error.message,
      status: error.status, // Include status if available from the custom error
      url,
      method: options.method || 'GET'
    });
    // Re-throw the error so the calling service/component can handle it
    throw error;
  }
};

// No more specific API objects here
// No default export needed 