import CrawlerView from "@/views/crawler-view";

interface CrawlerModeProps {
  params?: { crawlerId: string };
}

export default function CrawlerMode({ params }: CrawlerModeProps) {
  const crawlerId = params?.crawlerId;
  
  if (!crawlerId) {
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Invalid Crawler ID</h2>
          <p className="text-slate-400">No crawler ID provided in the URL.</p>
        </div>
      </div>
    );
  }
  
  return <CrawlerView crawlerId={crawlerId} />;
}