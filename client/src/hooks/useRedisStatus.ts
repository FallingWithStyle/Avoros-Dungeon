/**
 * File: useRedisStatus.ts
 * Responsibility: Monitors Redis server connection status and provides status information
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface RedisStatusData {
  available: boolean;
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

  useEffect(() => {
    if (redisStatus && !redisStatus.available) {
      setShowAlert(true);
    } else if (redisStatus && redisStatus.available) {
      setShowAlert(false);
    }
  }, [redisStatus]);

  return {
    isRedisAvailable: redisStatus?.available ?? true,
    redisMessage: redisStatus?.message ?? 'Checking Redis status...',
    showAlert,
    hideAlert: () => setShowAlert(false),
  };
}