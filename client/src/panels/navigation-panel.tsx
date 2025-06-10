
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
