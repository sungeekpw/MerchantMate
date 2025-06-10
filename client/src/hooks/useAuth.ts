import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "@/lib/queryClient";

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