import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
    gcTime: 0,
    refetchInterval: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
  };
}