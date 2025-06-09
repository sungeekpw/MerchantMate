import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0, // Always refetch
  });

  // Debug logging
  console.log('Auth state:', { user, isLoading, error, isAuthenticated: !!user && !error });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}