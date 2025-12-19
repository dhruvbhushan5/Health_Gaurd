// API Configuration for different environments
// This file provides a centralized API URL configuration

const getApiUrl = (): string => {
  // Check if environment variable is set (production)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Development: Use localhost backend
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000';
  }

  // Production: If no env var is set, default to relative path (if serving frontend from backend) 
  // or throw an error/log a warning if that's not the intended setup.
  // For now, returning empty string which usually defaults to current origin in axios
  return '';
};

export const API_URL = getApiUrl();

// Export for convenience
export default API_URL;
