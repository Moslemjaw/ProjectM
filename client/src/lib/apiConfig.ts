// API base URL configuration
// In development, use relative URLs (same origin)
// In production, use the backend API URL
const getApiBaseUrl = (): string => {
  // Check if we're in development
  if (import.meta.env.DEV) {
    return ""; // Relative URLs work in development
  }

  // In production, use the backend API URL from environment variable
  // Fallback to relative URL if not set (for same-origin deployments)
  return import.meta.env.VITE_API_URL || "";
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build full API URLs
export const buildApiUrl = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return API_BASE_URL ? `${API_BASE_URL}/${cleanPath}` : `/${cleanPath}`;
};
