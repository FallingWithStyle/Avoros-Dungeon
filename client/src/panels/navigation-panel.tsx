/**
 * File: navigation-panel.tsx
 * Responsibility: Container panel for room navigation controls
 * Notes: Wraps the room navigation component in a card layout for the main game view
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RoomNavigation from "@/components/room-navigation";
import { Navigation } from "lucide-react";
import type { CrawlerWithDetails } from "@shared/schema";

interface NavigationPanelProps {
  crawler: CrawlerWithDetails;
  energyDisabled: boolean;
}

export default function NavigationPanel({ crawler, energyDisabled }: NavigationPanelProps) {
  return (
    <RoomNavigation crawler={crawler} energyDisabled={energyDisabled} />
  );
}