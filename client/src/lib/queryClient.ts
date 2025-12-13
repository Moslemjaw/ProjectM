import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildApiUrl } from "./apiConfig";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    let errorMessage = res.statusText;

    // Check if response is HTML (likely a 404 page or error page)
    if (contentType.includes("text/html")) {
      const text = await res.text();
      // If we got HTML instead of JSON, the API endpoint probably doesn't exist
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        throw new Error(
          `404: API endpoint not found. Check that VITE_API_URL is set correctly. ` +
            `Received HTML instead of JSON from: ${res.url}`
        );
      }
      errorMessage = text.substring(0, 100);
    } else {
      // Try to parse as JSON
      try {
        const text = await res.text();
        const json = JSON.parse(text);
        errorMessage = json.message || json.error || text;
      } catch {
        const text = await res.text();
        errorMessage = text || res.statusText;
      }
    }

    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const fullUrl = buildApiUrl(url);
  const res = await fetch(fullUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/") as string;
    const fullUrl = buildApiUrl(path);
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
