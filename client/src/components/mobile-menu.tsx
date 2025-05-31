import { Button } from "@/components/ui/button";

export default function MobileMenu() {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-game-surface border-t border-game-border z-50">
      <div className="flex justify-around py-2">
        <Button
          variant="ghost"
          className="flex flex-col items-center p-3 text-blue-400 hover:text-blue-300"
        >
          <i className="fas fa-tachometer-alt text-lg"></i>
          <span className="text-xs mt-1">Overview</span>
        </Button>
        
        <Button
          variant="ghost"
          className="flex flex-col items-center p-3 text-slate-400 hover:text-white"
        >
          <i className="fas fa-users text-lg"></i>
          <span className="text-xs mt-1">Crawlers</span>
        </Button>
        
        <Button
          variant="ghost"
          className="flex flex-col items-center p-3 text-slate-400 hover:text-white"
        >
          <i className="fas fa-store text-lg"></i>
          <span className="text-xs mt-1">Market</span>
        </Button>
        
        <Button
          variant="ghost"
          className="flex flex-col items-center p-3 text-slate-400 hover:text-white"
        >
          <i className="fas fa-comments text-lg"></i>
          <span className="text-xs mt-1">Chat</span>
        </Button>
      </div>
    </div>
  );
}
