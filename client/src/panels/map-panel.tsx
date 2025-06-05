
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MiniMap from "@/components/map";
import type { CrawlerWithDetails } from "@shared/schema";

interface MapPanelProps {
  crawler: CrawlerWithDetails;
}

export default function MapPanel({ crawler }: MapPanelProps) {
  return (
    <Card className="bg-game-surface border-game-border">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <i className="fas fa-map mr-2 text-green-400"></i>
          Mini-Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MiniMap crawler={crawler} />
      </CardContent>
    </Card>
  );
}
