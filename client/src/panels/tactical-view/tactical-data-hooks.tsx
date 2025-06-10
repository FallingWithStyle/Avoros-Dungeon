import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { CrawlerWithDetails } from "@shared/schema";

interface TacticalDataHooks {
  roomData: any;
  tacticalData: any;
  isLoading: boolean;
  tacticalLoading: boolean;
  tacticalError: any;
  refetchTactical: () => void;
  refetchExploredRooms: () => void;
}

export function useTacticalData(crawler: CrawlerWithDetails): TacticalDataHooks {
  const { toast } = useToast();

  // Ensure crawler.id is consistent to prevent hook ordering issues
  const crawlerId = crawler.id;

  // Fetch current room data for navigation
  const { data: roomData, isLoading } = useQuery({
    queryKey: ["/api/crawlers/" + crawlerId + "/current-room"],
    refetchInterval: 5000, // Reduced from 2000ms to 5000ms
  });

  // Fetch explored rooms for map refresh - only on demand, not polling
  const { refetch: refetchExploredRooms } = useQuery({
    queryKey: ["/api/crawlers/" + crawlerId + "/explored-rooms"],
    enabled: false, // Only fetch when manually called
    staleTime: 300000, // 5 minutes
    retry: false,
  });

  // Fetch tactical data separately for better caching with improved error handling
  const { 
    data: tacticalData, 
    isLoading: tacticalLoading, 
    error: tacticalError, 
    refetch: refetchTactical 
  } = useQuery({
    queryKey: ["/api/crawlers/" + crawlerId + "/tactical-data"],
    refetchInterval: (data, error) => {
      if (error) return false;
      return 3000; // Reduced from 2000ms to 3000ms
    },
    retry: (failureCount, error) => {
      if (error?.message?.includes('500')) {
        return failureCount < 1;
      }
      if (error?.message?.includes('4')) {
        const status = parseInt(error.message.split(':')[0]);
        if (status >= 400 && status < 500 && status !== 408) {
          return false;
        }
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 10000,
    onError: (error) => {
      console.error("=== TACTICAL DATA FETCH ERROR ===");
      console.error("Error details:", error);
      if (!sessionStorage.getItem("tactical-error-" + crawlerId)) {
        sessionStorage.setItem("tactical-error-" + crawlerId, 'true');
        toast({
          title: "Tactical Data Error",
          description: "Using fallback tactical data. Some features may be limited.",
          variant: "destructive",
        });
        setTimeout(() => {
          sessionStorage.removeItem("tactical-error-" + crawlerId);
        }, 30000);
      }
    },
    onSuccess: (data) => {
      console.log("=== TACTICAL DATA FETCH SUCCESS ===");
      console.log("Room:", data.room?.name);
      console.log("Entities:", data.tacticalEntities?.length || 0);
      sessionStorage.removeItem("tactical-error-" + crawlerId);
    },
  });

  return {
    roomData,
    tacticalData,
    isLoading,
    tacticalLoading,
    tacticalError,
    refetchTactical,
    refetchExploredRooms
  };
}

