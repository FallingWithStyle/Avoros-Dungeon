
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
    queryKey: ['/api/system/redis-status'],
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
    staleTime: 25000, // Consider data stale after 25 seconds
  });

  const { data: fallbackStatus } = useQuery<FallbackStatusData>({
    queryKey: ['/api/debug/redis-fallback'],
    refetchInterval: 30000, // Check every 30 seconds
    retry: false,
    staleTime: 25000, // Consider data stale after 25 seconds
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
