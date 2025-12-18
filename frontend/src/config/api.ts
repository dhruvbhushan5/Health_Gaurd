// API Configuration for different environments
// This file provides a centralized API URL configuration

const getApiUrl = (): string => {
  // Check if environment variable is set (production)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Development: Use localhost backend
  if (process.env.NODE_ENV === 'development') {
    return 'http://127.0.0.1:8080';
  }
  
  // Production fallback: Use relative URL (assumes same domain) or configure your production backend URL
  return 'https://your-backend-domain.com'; // TODO: Replace with actual production backend URL
};

export const API_URL = getApiUrl();

// Export for convenience
export default API_URL;
