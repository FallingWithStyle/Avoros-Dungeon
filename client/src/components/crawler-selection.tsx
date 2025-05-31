import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Zap, Shield, Gauge, Cpu, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CrawlerCandidate {
  id: string;
  name: string;
  stats: {
    health: number;
    maxHealth: number;
    attack: number;
    defense: number;
    speed: number;
    tech: number;
  };
  competencies: string[];
  background: string;
  startingEquipment: any[];
  topAbility: {
    name: string;
    value: number;
    description: string;
  };
  level: number;
}

interface CrawlerSelectionProps {
  onSelect: (candidate: CrawlerCandidate) => void;
  onCancel: () => void;
}

export default function CrawlerSelection({ onSelect, onCancel }: CrawlerSelectionProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<CrawlerCandidate | null>(null);
  const { toast } = useToast();

  const { data: candidates, isLoading, error } = useQuery({
    queryKey: ["/api/crawlers/candidates"],
  });

  // Debug logging
  console.log("Candidates data:", candidates);
  console.log("Is loading:", isLoading);
  console.log("Error:", error);

  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
          <p className="text-slate-400">Generating 30 crawler candidates...</p>
        </div>
      </div>
    );
  }

  const handleSelect = () => {
    if (selectedCandidate) {
      onSelect(selectedCandidate);
    }
  };

  return (
    <div className="space-y-6 px-8 py-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white">Select Your Crawler</h3>
        <p className="text-slate-400">Choose from these 30 Level 0 crawler candidates. Each has unique stats, competencies, and equipment.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto pr-2">
        {Array.isArray(candidates) && candidates.map((candidate: CrawlerCandidate) => (
          <Card 
            key={candidate.id}
            className={`cursor-pointer transition-all border-2 ${
              selectedCandidate?.id === candidate.id 
                ? 'border-blue-500 bg-blue-500/10' 
                : 'border-game-border hover:border-slate-600'
            } bg-game-surface`}
            onClick={() => setSelectedCandidate(candidate)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-lg">{candidate.name}</CardTitle>
                </div>
                <Badge variant="outline" className="border-green-600/30 text-green-400">
                  {candidate.topAbility.name}
                </Badge>
              </div>
              <CardDescription className="text-sm text-slate-400">
                Level {candidate.level} • {candidate.topAbility.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Background */}
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Background</h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {candidate.background}
                </p>
              </div>

              <Separator className="bg-game-border" />

              {/* Stats */}
              <div>
                <h4 className="font-semibold text-slate-200 mb-3">Statistics</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-red-400" />
                      <span className="text-sm">Attack</span>
                    </div>
                    <span className="text-sm font-mono">{candidate.stats.attack}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <span className="text-sm">Defense</span>
                    </div>
                    <span className="text-sm font-mono">{candidate.stats.defense}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm">Speed</span>
                    </div>
                    <span className="text-sm font-mono">{candidate.stats.speed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      <span className="text-sm">Tech</span>
                    </div>
                    <span className="text-sm font-mono">{candidate.stats.tech}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-400" />
                      <span className="text-sm">Health</span>
                    </div>
                    <span className="text-sm font-mono">{candidate.stats.health}</span>
                  </div>
                </div>
              </div>

              <Separator className="bg-game-border" />

              {/* Competencies */}
              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Competencies</h4>
                <div className="flex flex-wrap gap-1">
                  {candidate.competencies.map((comp, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Starting Equipment */}
              <div>
                <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Starting Equipment
                </h4>
                <div className="space-y-1">
                  {candidate.startingEquipment.map((equipment, index) => (
                    <div key={index} className="text-sm text-slate-400">
                      • {equipment.name}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCandidate && (
        <Card className="bg-game-surface border-game-border">
          <CardHeader>
            <CardTitle className="text-green-400">Confirm Selection</CardTitle>
            <CardDescription>
              Ready to sponsor {selectedCandidate.name}? This will create an official sponsorship agreement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={handleSelect}
                className="bg-green-600 hover:bg-green-700"
              >
                Sponsor {selectedCandidate.name}
              </Button>
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="border-game-border"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}