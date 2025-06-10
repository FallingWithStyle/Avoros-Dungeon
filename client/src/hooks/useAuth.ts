/**
 * File: useAuth.ts
 * Responsibility: User authentication state management and session checking
 * Notes: Provides current user data and authentication status throughout the app
 */

import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
