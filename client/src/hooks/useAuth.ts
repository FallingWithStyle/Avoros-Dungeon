/**
 * File: useAuth.ts
 * Responsibility: User authentication state management and session checking
 * Notes: Provides current user data and authentication status throughout the app
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Not authenticated");
      }
      return response.json();
    },
    retry: false,
  });

  const logout = () => {
    // Clear all cached data before logout
    queryClient.clear();
    // Navigate to server logout endpoint
    window.location.href = "/api/logout";
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  };
}
