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
      const res = await fetch(buildApiUrl("/api/auth/user"), {
        credentials: "include",
      });

      // Return null on 401 (not authenticated)
      if (res.status === 401) {
        return null;
      }

      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }

      return await res.json();
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
