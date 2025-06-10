/**
 * File: map-panel.tsx
 * Responsibility: Wrapper component that renders the dungeon map for a given crawler
 * Notes: Simple container that passes crawler data to the DungeonMap component
 */

import React from "react";
import DungeonMap from "@/components/dungeon-map";
import { CrawlerWithDetails } from "@shared/schema";

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