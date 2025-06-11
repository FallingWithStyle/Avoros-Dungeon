/**
 * File: useRedisStatus.ts
 * Responsibility: Redis connection monitoring and fallback status alerting
 * Notes: Polls Redis status and manages user notifications for connection issues
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface RedisStatusData {
  available: boolean;
  message: string;
}

interface FallbackStatusData {
  success: boolean;
  fallbackMode: boolean;
  message: string;
}

export function useRedisStatus() {
  const [showAlert, setShowAlert] = useState(false);

  const { data: redisStatus } = useQuery<RedisStatusData>({
    queryKey: ['/api/debug/redis-status'],
    refetchInterval: 60000, // Reduced frequency to 60 seconds
    retry: false,
    staleTime: 50000, // Consider data stale after 50 seconds
  });

  const { data: fallbackStatus } = useQuery<FallbackStatusData>({
    queryKey: ['/api/debug/redis-fallback'],
    refetchInterval: 60000, // Reduced frequency to 60 seconds
    retry: false,
    staleTime: 50000, // Consider data stale after 50 seconds
  });

  useEffect(() => {
    // Only show the performance alert when in "DB Only" mode (fallback enabled)
    // AND when Redis is actually unavailable
    const shouldShowAlert = fallbackStatus?.fallbackMode && redisStatus && !redisStatus.available;

    setShowAlert(shouldShowAlert || false);
  }, [redisStatus, fallbackStatus]);

  return {
    isRedisAvailable: redisStatus?.available ?? true,
    redisMessage: redisStatus?.message ?? 'Checking Redis status...',
    showAlert,
    hideAlert: () => setShowAlert(false),
  };
}