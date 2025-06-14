/**
 * File: useAuth.ts
 * Responsibility: User authentication state management and session checking
 * Notes: Provides current user data and authentication status throughout the app
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const logout = () => {
    // Clear all cached data before logout
    queryClient.clear();
    // Navigate to server logout endpoint
    window.location.href = "/api/logout";
  };

  // Only consider user authenticated if we have valid user data
  const isAuthenticated = !!user && !error;

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
  };
}
