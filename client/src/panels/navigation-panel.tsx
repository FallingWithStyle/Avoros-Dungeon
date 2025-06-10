
/**
 * File: navigation-panel.tsx
 * Responsibility: Wrapper component for room navigation controls
 * Notes: Passes crawler data and energy settings to the RoomNavigation component
 */

import RoomNavigation from "@/components/room-navigation";
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
