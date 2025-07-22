import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 60000, // Cache user data for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchInterval: false,
  });

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Clear all query cache to remove any cached user data
      queryClient.clear();
      
      if (response.ok) {
        window.location.href = '/auth';
      } else {
        console.error('Logout failed');
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error('Logout error:', error);
      queryClient.clear();
      window.location.href = '/auth';
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
    logout,
  };
}