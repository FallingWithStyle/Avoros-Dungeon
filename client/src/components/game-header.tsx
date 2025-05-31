import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function GameHeader() {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getDisplayName = () => {
    if (user?.firstName || user?.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'Commander';
  };

  return (
    <header className="bg-game-surface border-b border-game-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-blue-400">
              <i className="fas fa-dungeon mr-2"></i>
              Dungeon Depths
            </h1>
            <div className="hidden md:block text-sm text-slate-400">
              Intergalactic Crawler Division
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center space-x-4">
            <div className="bg-game-bg rounded-lg p-1 flex">
              <Button
                size="sm"
                className="bg-sponsor text-white hover:bg-sponsor/90"
              >
                <i className="fas fa-crown mr-2"></i>Sponsor
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                <i className="fas fa-user-ninja mr-2"></i>Crawler
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">{getDisplayName()}</div>
                <div className="text-xs text-slate-400">
                  Credits: <span className="text-green-400 font-mono">{user?.credits?.toLocaleString() || 0}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Avatar className="w-10 h-10 border-2 border-sponsor">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={getDisplayName()} />
                  <AvatarFallback className="bg-sponsor text-white">
                    {getDisplayName().charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-white"
                >
                  <i className="fas fa-sign-out-alt"></i>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
