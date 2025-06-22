/**
 * File: App.tsx
 * Responsibility: Main application component handling routing, authentication, and global providers
 * Notes: Sets up React Query, tooltips, toasts, and conditional routing based on auth state
 */

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { RedisStatusIndicator } from "@/components/redis-status-indicator";
import HeaderNavigation from "@/components/header-navigation";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import CrawlerMode from "@/pages/crawler-mode";
import Account from "@/pages/account";
import NotFound from "@/pages/not-found";
import CrawlerLoadout from "@/pages/crawler-loadout";
import TestCombat from "@/pages/test-combat";
import DatabaseAnalysis from "@/pages/database-analysis";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // console.log("🔍 Router Debug:", { isAuthenticated, isLoading });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center">
        <div className="text-slate-100">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {!isLoading && isAuthenticated && <HeaderNavigation />}
      <Switch>
        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/crawler/:id" component={({ params }: { params: { id: string } }) => (
              <CrawlerMode crawlerId={params.id} />
            )} />
            <Route path="/crawler/:id/loadout" component={({ params }: { params: { id: string } }) => (
              <CrawlerLoadout crawlerId={params.id} />
            )} />
            <Route path="/account" component={Account} />
            <Route path="/test" component={TestCombat} />
            <Route path="/database" component={DatabaseAnalysis} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <RedisStatusIndicator />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;