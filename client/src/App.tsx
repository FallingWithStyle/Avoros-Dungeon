/**
 * File: App.tsx
 * Responsibility: Main application component handling routing, authentication, and global providers
 * Notes: Sets up React Query, tooltips, toasts, and conditional routing based on auth state
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Router, Route, Switch } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from 'react-error-boundary';
import Home from '@/pages/home';
import Landing from '@/pages/landing';
import Account from '@/pages/account';
import CrawlerMode from '@/pages/crawler-mode';
import CrawlerLoadout from '@/pages/crawler-loadout';
import NotFound from '@/pages/not-found';
import { RedisStatusIndicator } from "@/components/redis-status-indicator";
import { TooltipProvider } from "@/components/ui/tooltip";
import HeaderNavigation from "@/components/header-navigation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
        <p className="text-slate-300 mb-4">{error.message}</p>
        <button 
          onClick={resetErrorBoundary}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('🔍 Router Debug:', { isAuthenticated, isLoading });

  // Show loading state during authentication check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-crawler mb-4"></i>
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Once loading is complete, render based on authentication status
  if (!isAuthenticated) {
    return (
      <div>
        <Switch>
          <Route path="/" component={Landing} />
          <Route component={Landing} />
        </Switch>
      </div>
    );
  }

  // User is authenticated, show full app
  return (
    <div>
      <HeaderNavigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/crawler/:id" component={({ params }: { params: { id: string } }) => (
          <CrawlerMode crawlerId={params.id} />
        )} />
        <Route path="/crawler/:id/loadout" component={({ params }: { params: { id: string } }) => (
          <CrawlerLoadout crawlerId={params.id} />
        )} />
        <Route path="/account" component={Account} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Global error caught by boundary:', error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
          <RedisStatusIndicator />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}