import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Building2, Bot, User, Settings } from "lucide-react";

export default function HeaderNavigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  // Get the user's crawlers to determine active crawler
  const { data: crawlers } = useQuery({
    queryKey: ["/api/crawlers"],
    retry: false,
  });

  // Determine the crawler navigation URL based on user's crawlers
  const getCrawlerHref = () => {
    const activeCrawlers = crawlers?.filter((c: any) => c.isAlive) || [];
    if (activeCrawlers.length > 0) {
      return `/crawler/${activeCrawlers[0].id}`;
    }
    return "/"; // Fallback to sponsor page if no active crawler
  };

  const navItems = [
    {
      href: "/",
      label: "Sponsor",
      icon: Building2,
      description: "Corporation Overview"
    },
    {
      href: getCrawlerHref(),
      label: "Crawler",
      icon: Bot,
      description: "Active Crawler Control",
      disabled: !crawlers?.some((c: any) => c.isAlive)
    },
    {
      href: "/account",
      label: "Account",
      icon: User,
      description: "Profile & Settings"
    }
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/" || location === "/home";
    }
    if (href === "/crawler") {
      return location.startsWith("/crawler");
    }
    return location === href;
  };

  return (
    <header className="border-b border-amber-600/20 bg-gradient-to-r from-amber-950/30 to-orange-900/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-xl font-bold text-amber-300">
              Dungeon Depths
            </div>
            
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const disabled = item.disabled;
                
                if (disabled) {
                  return (
                    <Button
                      key={item.label}
                      variant="ghost"
                      size="sm"
                      disabled
                      className="flex items-center gap-2 text-amber-300/30 cursor-not-allowed"
                      title="No active crawler - create or activate a crawler from the Sponsor page"
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  );
                }
                
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={active ? "secondary" : "ghost"}
                      size="sm"
                      className={`flex items-center gap-2 ${
                        active 
                          ? "bg-amber-600/20 text-amber-200 border border-amber-600/30" 
                          : "text-amber-300/70 hover:text-amber-200 hover:bg-amber-600/10"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {user && (
              <div className="flex items-center space-x-2 text-sm text-amber-200/70">
                <span>{user.email || "Anonymous"}</span>
                <Badge variant="outline" className="border-amber-600/30 text-amber-300">
                  Credits: {user.credits || 0}
                </Badge>
              </div>
            )}
            
            <Link href="/api/logout">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-amber-300/70 hover:text-amber-200 hover:bg-amber-600/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}