
import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { useToast } from '@/hooks/use-toast';
import { isEnergyDisabled } from '@/components/debug-panel';
import type { CrawlerWithDetails } from '@shared/schema';

interface UseDungeonMapMovementProps {
  crawler: CrawlerWithDetails;
  availableDirections: string[];
}

export function useDungeonMapMovement({ 
  crawler, 
  availableDirections 
}: UseDungeonMapMovementProps) {
  const { toast } = useToast();
  const [pendingDirection, setPendingDirection] = useState<string | null>(null);

  // Movement mutation with optimistic updates
  const moveMutation = useMutation({
    mutationFn: async (direction: string) => {
      return await apiRequest("POST", `/api/crawlers/${crawler.id}/move`, {
        direction,
        debugEnergyDisabled: isEnergyDisabled(),
      });
    },
    onMutate: async (direction) => {
      // Optimistic update - immediately show movement is happening
      setPendingDirection(direction);
    },
    onSuccess: (data) => {
      // Batch invalidations with shorter delay
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: [`/api/crawlers/${crawler.id}/current-room`],
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      }, 100); // Small delay to batch updates

      setPendingDirection(null);
    },
    onError: (error) => {
      setPendingDirection(null);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Movement failed",
        description: error.message || "Could not move in that direction.",
        variant: "destructive",
      });
    },
  });

  const handleMove = useCallback(
    (direction: string) => {
      if (
        moveMutation.isPending ||
        !availableDirections.includes(direction)
      ) {
        return;
      }
      if (!isEnergyDisabled() && crawler.energy < 10) {
        toast({
          title: "Not enough energy",
          description: "You need at least 10 energy to move between rooms.",
          variant: "destructive",
        });
        return;
      }

      // Store the movement direction for tactical view positioning BEFORE the API call
      // This ensures it's available immediately when the new room loads
      if (['north', 'south', 'east', 'west'].includes(direction)) {
        sessionStorage.setItem('lastMovementDirection', direction);
        // Also store as entry direction for immediate use
        sessionStorage.setItem('entryDirection', direction);
      }

      setPendingDirection(direction);
      moveMutation.mutate(direction);
    },
    [moveMutation, availableDirections, crawler.energy, toast],
  );

  // WASD keyboard controls for dungeon navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      let direction: string | null = null;
      switch (key) {
        case "w":
          direction = "north";
          break;
        case "s":
          direction = "south";
          break;
        case "a":
          direction = "west";
          break;
        case "d":
          direction = "east";
          break;
        case "q":
          direction = "staircase";
          break;
        default:
          return;
      }
      event.preventDefault();
      if (direction) {
        handleMove(direction);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleMove]);

  return {
    handleMove,
    moveMutation,
    pendingDirection,
    isMoving: moveMutation.isPending
  };
}
