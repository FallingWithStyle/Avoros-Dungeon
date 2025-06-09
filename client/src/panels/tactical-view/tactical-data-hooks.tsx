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

  // Fetch current room data for navigation
  const { data: roomData, isLoading } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/current-room`],
    refetchInterval: 2000,
  });

  // Fetch explored rooms for map refresh
  const { refetch: refetchExploredRooms } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/explored-rooms`],
    refetchInterval: 30000,
    staleTime: 120000,
    retry: false,
  });

  // Fetch tactical data separately for better caching with improved error handling
  const { 
    data: tacticalData, 
    isLoading: tacticalLoading, 
    error: tacticalError, 
    refetch: refetchTactical 
  } = useQuery({
    queryKey: [`/api/crawlers/${crawler.id}/tactical-data`],
    refetchInterval: (data, error) => {
      if (error) return false;
      return 2000;
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
      if (!sessionStorage.getItem(`tactical-error-${crawler.id}`)) {
        sessionStorage.setItem(`tactical-error-${crawler.id}`, 'true');
        toast({
          title: "Tactical Data Error",
          description: "Using fallback tactical data. Some features may be limited.",
          variant: "destructive",
        });
        setTimeout(() => {
          sessionStorage.removeItem(`tactical-error-${crawler.id}`);
        }, 30000);
      }
    },
    onSuccess: (data) => {
      console.log("=== TACTICAL DATA FETCH SUCCESS ===");
      console.log("Room:", data.room?.name);
      console.log("Entities:", data.tacticalEntities?.length || 0);
      sessionStorage.removeItem(`tactical-error-${crawler.id}`);
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

export function useTacticalData(crawlerId: number) {
  return useQuery({
    queryKey: ['tacticalData', crawlerId],
    queryFn: async () => {
      console.log('📡 Fetching tactical data for crawler:', crawlerId);
      const response = await fetch(`/api/crawlers/${crawlerId}/tactical-data`);
      if (!response.ok) {
        throw new Error('Failed to fetch tactical data');
      }
      const data = await response.json();
      console.log('📊 Received tactical data:', {
        entities: data.entities?.length || 0,
        entityTypes: data.entities?.map((e: any) => `${e.type}: ${e.name}`) || []
      });
      return data;
    },
    refetchInterval: 2000, // Refetch every 2 seconds
    staleTime: 1000, // Consider data stale after 1 second
  });
}