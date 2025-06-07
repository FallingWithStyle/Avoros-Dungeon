import React from "react";
import Map from "@/components/map";
import { CrawlerWithDetails } from "@shared/schema";

interface MapPanelProps {
  crawler: CrawlerWithDetails;
}

export default function MapPanel({ crawler }: MapPanelProps) {
  if (!crawler) {
    return (
      <div className="space-y-4">
        <div className="text-slate-400">Loading crawler data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Map crawler={crawler} />
    </div>
  );
}