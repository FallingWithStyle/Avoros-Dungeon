/**
 * File: map-panel.tsx
 * Responsibility: Container panel for the dungeon map component
 * Notes: Wraps the dungeon map in a card layout for the main game view
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DungeonMap from "@/components/dungeon-map";
import { Map } from "lucide-react";
import type { CrawlerWithDetails } from "@shared/schema";

interface MapPanelProps {
  crawler: CrawlerWithDetails;
}

export default function MapPanel({ crawler }: MapPanelProps) {
  // Don't render anything if crawler is not available
  if (!crawler) {
    return null;
  }

  return (
    <div className="space-y-4">
      <DungeonMap crawler={crawler} />
    </div>
  );
}