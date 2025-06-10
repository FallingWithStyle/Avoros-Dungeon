/**
 * File: crawler-mode.tsx
 * Responsibility: Page wrapper for crawler mode, passing crawler ID to the CrawlerView component
 * Notes: Simple container component that connects the route parameter to the crawler interface
 */

import CrawlerView from "@/views/crawler-view";

interface CrawlerModeProps {
  crawlerId: string;
}

export default function CrawlerMode({ crawlerId }: CrawlerModeProps) {
  return <CrawlerView crawlerId={crawlerId} />;
}
