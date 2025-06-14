
/**
 * File: crawler-loadout.tsx
 * Responsibility: Page wrapper for crawler equipment and customization management
 * Notes: Provides equipment management, stat customization, and gear optimization interface
 */

import CrawlerLoadoutView from "@/views/crawler-loadout-view";

interface CrawlerLoadoutProps {
  crawlerId: string;
}

export default function CrawlerLoadout({ crawlerId }: CrawlerLoadoutProps) {
  return <CrawlerLoadoutView crawlerId={crawlerId} />;
}
