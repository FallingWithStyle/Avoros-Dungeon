import CrawlerView from "@/views/crawler-view";

interface CrawlerModeProps {
  crawlerId: string;
}

export default function CrawlerMode({ crawlerId }: CrawlerModeProps) {
  return <CrawlerView crawlerId={crawlerId} />;
}
