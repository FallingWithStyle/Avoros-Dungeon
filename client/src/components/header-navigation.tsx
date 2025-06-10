import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Building2, Bot, User, Settings, Menu, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Primary Navigation */}
          <div className="flex items-center space-x-2">
            <div className="text-xl font-bold text-amber-300">
              Avavor
            </div>
            
            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden md:flex items-center space-x-1 ml-6">
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

          {/* Right Side - User Info and Menu */}
          <div className="flex items-center space-x-2">
            {/* Credits Badge - Always visible but compact on mobile */}
            {user && (
              <Badge variant="outline" className="border-amber-600/30 text-amber-300 text-xs">
                <span className="hidden sm:inline">Credits: </span>
                {user.credits || 0}
              </Badge>
            )}
            
            {/* Desktop User Info */}
            {user && (
              <div className="hidden lg:flex items-center space-x-2 text-sm text-amber-200/70">
                <span>{user.email || "Anonymous"}</span>
              </div>
            )}
            
            {/* Mobile Menu Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-amber-300/70 hover:text-amber-200 hover:bg-amber-600/10"
                >
                  <Menu className="w-4 h-4 md:hidden" />
                  <div className="hidden md:flex items-center gap-1">
                    <Settings className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {/* Mobile Navigation Items */}
                <div className="md:hidden">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const disabled = item.disabled;
                    
                    if (disabled) {
                      return (
                        <DropdownMenuItem key={item.label} disabled>
                          <Icon className="w-4 h-4 mr-2" />
                          {item.label}
                        </DropdownMenuItem>
                      );
                    }
                    
                    return (
                      <Link key={item.href} href={item.href}>
                        <DropdownMenuItem className={active ? "bg-amber-600/10" : ""}>
                          <Icon className="w-4 h-4 mr-2" />
                          {item.label}
                        </DropdownMenuItem>
                      </Link>
                    );
                  })}
                  <DropdownMenuSeparator />
                </div>
                
                {/* User Info for Mobile */}
                {user && (
                  <div className="md:hidden">
                    <DropdownMenuItem disabled>
                      <User className="w-4 h-4 mr-2" />
                      {user.email || "Anonymous"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </div>
                )}
                
                {/* Logout */}
                <Link href="/api/logout">
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}