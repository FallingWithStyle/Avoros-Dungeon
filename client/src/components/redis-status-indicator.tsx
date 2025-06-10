/**
 * File: redis-status-indicator.tsx
 * Responsibility: Displays the current Redis connection status with visual indicators
 */
import React from "react";
import { Badge } from "@/components/ui/badge";
import { useRedisStatus } from "@/hooks/useRedisStatus";
import { Database, AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from 'react';
import { useRedisStatus } from '@/hooks/useRedisStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, Info } from 'lucide-react';

export function RedisStatusIndicator() {
  const { isRedisAvailable, redisMessage, showAlert, hideAlert } = useRedisStatus();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isRedisAvailable || !showAlert) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {isExpanded ? (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="pr-8">
            <div className="font-medium mb-1">Performance Notice</div>
            <div className="text-sm">
              Our caching system is temporarily unavailable. The app is working normally but may be a bit slower than usual.
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 w-6 p-0 text-amber-600 hover:text-amber-800"
              onClick={() => {
                setIsExpanded(false);
                hideAlert();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 shadow-sm"
          onClick={() => setIsExpanded(true)}
        >
          <Info className="h-4 w-4 mr-1" />
          <span className="text-xs">Performance Notice</span>
        </Button>
      )}
    </div>
  );
}