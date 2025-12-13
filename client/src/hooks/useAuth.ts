import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { buildApiUrl } from "@/lib/apiConfig";

export function useAuth() {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const url = buildApiUrl("/api/auth/user");
      try {
        const res = await fetch(url, {
          credentials: "include",
        });

        // Return null on 401 (not authenticated)
        if (res.status === 401) {
          return null;
        }

        if (!res.ok) {
          console.error(
            `Auth check failed: ${res.status} ${res.statusText} from ${url}`
          );
          throw new Error(`${res.status}: ${res.statusText}`);
        }

        return await res.json();
      } catch (error: any) {
        // Log helpful error message for 404s
        if (error.message?.includes("404")) {
          console.error(
            "❌ API endpoint not found. Make sure VITE_API_URL is set in Vercel:",
            import.meta.env.VITE_API_URL || "NOT SET"
          );
        }
        throw error;
      }
    },
    retry: false,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  return {
    user: user ?? undefined,
    isLoading,
    isAuthenticated: !!user,
  };
}
