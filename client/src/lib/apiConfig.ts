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
  const apiUrl = import.meta.env.VITE_API_URL || "";

  // Log warning in console if API URL is not set in production
  if (!apiUrl && !import.meta.env.DEV) {
    console.warn(
      "⚠️ VITE_API_URL is not set! API calls will fail. " +
        "Set VITE_API_URL=https://project-management-system-4phy.onrender.com in Vercel environment variables."
    );
  }

  return apiUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build full API URLs
export const buildApiUrl = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const fullUrl = API_BASE_URL
    ? `${API_BASE_URL}/${cleanPath}`
    : `/${cleanPath}`;

  // Log API URL in development for debugging
  if (import.meta.env.DEV) {
    console.log(`[API] ${path} -> ${fullUrl}`);
  }

  return fullUrl;
};
