import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  Sword, 
  Shield, 
  Gauge, 
  Cpu, 
  Users, 
  Package, 
  TrendingUp,
  MapPin,
  Clock,
  Heart,
  Coins
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { showErrorToast } from "@/lib/errorToast";
import type { CrawlerWithDetails } from "@shared/schema";

interface ExplorationPanelProps {
  crawler: CrawlerWithDetails;
}

export default function ExplorationPanel({ crawler: initialCrawler }: ExplorationPanelProps) {
  const [isExploring, setIsExploring] = useState(false);
  const { toast } = useToast();

  // Fetch live crawler data to ensure real-time updates
  const { data: crawlers } = useQuery({
    queryKey: ["/api/crawlers"],
  });
  
  // Use the live crawler data if available, otherwise fall back to the prop
  const crawler = crawlers?.find((c: CrawlerWithDetails) => c.id === initialCrawler.id) || initialCrawler;

  const exploreMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/crawlers/${crawler.id}/explore`);
    },
    onSuccess: (encounter) => {
      setIsExploring(false);
      // Force immediate refresh of crawler data
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.refetchQueries({ queryKey: ["/api/crawlers"] });
      
      // Show encounter result
      toast({
        title: "Encounter!",
        description: encounter.storyText || `You encountered a ${encounter.type}!`,
      });
    },
    onError: (error) => {
      setIsExploring(false);
      showErrorToast("Exploration Failed", error);
    },
  });

  const handleExplore = () => {
    if (crawler.energy < 10) {
      toast({
        title: "Insufficient Energy",
        description: "Your crawler needs at least 10 energy to explore.",
        variant: "destructive",
      });
      return;
    }
    
    setIsExploring(true);
    exploreMutation.mutate();
  };

  const energyPercentage = (crawler.energy / crawler.maxEnergy) * 100;
  const healthPercentage = (crawler.health / crawler.maxHealth) * 100;

  return (
    <Card className="bg-game-surface border-game-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-400 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Floor {crawler.currentFloor} - {crawler.name}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Level {crawler.level} Crawler
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-green-600/30 text-green-400">
            {crawler.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status Bars */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium">Energy</span>
              </div>
              <span className="text-sm font-mono">{crawler.energy}/{crawler.maxEnergy}</span>
            </div>
            <Progress 
              value={energyPercentage} 
              className="h-2"
              style={{ 
                background: "rgb(30 41 59)",
              }}
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium">Health</span>
              </div>
              <span className="text-sm font-mono">{crawler.health}/{crawler.maxHealth}</span>
            </div>
            <Progress 
              value={healthPercentage} 
              className="h-2"
              style={{ 
                background: "rgb(30 41 59)",
              }}
            />
          </div>
        </div>

        <Separator className="bg-game-border" />

        {/* Stats */}
        <div>
          <h4 className="font-semibold text-slate-200 mb-3">Combat Stats</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sword className="w-4 h-4 text-red-400" />
                <span className="text-sm">Attack</span>
              </div>
              <span className="text-sm font-mono text-red-400">{crawler.attack}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm">Defense</span>
              </div>
              <span className="text-sm font-mono text-blue-400">{crawler.defense}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-yellow-400" />
                <span className="text-sm">Speed</span>
              </div>
              <span className="text-sm font-mono text-yellow-400">{crawler.speed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span className="text-sm">Tech</span>
              </div>
              <span className="text-sm font-mono text-purple-400">{crawler.tech}</span>
            </div>
          </div>
        </div>

        <Separator className="bg-game-border" />

        {/* Competencies */}
        <div>
          <h4 className="font-semibold text-slate-200 mb-2">Active Competencies</h4>
          <div className="flex flex-wrap gap-1">
            {crawler.competencies?.map((comp, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {comp}
              </Badge>
            )) || <span className="text-slate-400 text-sm">No competencies active</span>}
          </div>
        </div>

        <Separator className="bg-game-border" />

        {/* Resources */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-sm">Credits</span>
          </div>
          <span className="text-sm font-mono text-yellow-400">{crawler.credits.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm">Experience</span>
          </div>
          <span className="text-sm font-mono text-green-400">{crawler.experience.toLocaleString()}</span>
        </div>

        <Separator className="bg-game-border" />

        {/* Exploration Action */}
        <div className="space-y-3">
          <Button 
            onClick={handleExplore}
            disabled={isExploring || crawler.energy < 10 || !crawler.isAlive}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {isExploring ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Exploring...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Explore Floor {crawler.currentFloor} (-10 Energy)
              </>
            )}
          </Button>
          
          {crawler.energy < 10 && (
            <p className="text-sm text-amber-400 text-center">
              <Clock className="w-3 h-3 inline mr-1" />
              Energy regenerates over time
            </p>
          )}
          
          {!crawler.isAlive && (
            <p className="text-sm text-red-400 text-center">
              This crawler has died and cannot explore
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}