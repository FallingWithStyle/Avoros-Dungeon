import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import GameHeader from "@/components/game-header";
import Sidebar from "@/components/sidebar";
import CrawlerCard from "@/components/crawler-card";
import ActivityFeed from "@/components/activity-feed";
import ChatPanel from "@/components/chat-panel";
import Leaderboard from "@/components/leaderboard";
import MobileMenu from "@/components/mobile-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCrawlerSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import type { CrawlerWithDetails, CrawlerClass, ActivityWithDetails } from "@shared/schema";
import { z } from "zod";

const createCrawlerFormSchema = insertCrawlerSchema.pick({
  name: true,
  classId: true,
});

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: crawlers, isLoading: crawlersLoading } = useQuery<CrawlerWithDetails[]>({
    queryKey: ["/api/crawlers"],
    enabled: isAuthenticated,
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityWithDetails[]>({
    queryKey: ["/api/activities"],
    enabled: isAuthenticated,
  });

  const { data: crawlerClasses } = useQuery<CrawlerClass[]>({
    queryKey: ["/api/crawler-classes"],
  });

  const form = useForm<z.infer<typeof createCrawlerFormSchema>>({
    resolver: zodResolver(createCrawlerFormSchema),
    defaultValues: {
      name: "",
      classId: 0,
    },
  });

  const createCrawlerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createCrawlerFormSchema>) => {
      await apiRequest("POST", "/api/crawlers", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Crawler deployed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/crawlers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create crawler. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof createCrawlerFormSchema>) => {
    createCrawlerMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-400 mb-4"></i>
          <p className="text-slate-300">Loading command center...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="bg-game-bg text-slate-100 min-h-screen">
      <GameHeader />
      
      <div className="flex min-h-screen">
        <Sidebar />
        
        <main className="flex-1 p-6 pb-20 lg:pb-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white">Command Center</h2>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <i className="fas fa-plus mr-2"></i>
                    Deploy New Crawler
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-game-surface border-game-border text-white">
                  <DialogHeader>
                    <DialogTitle>Deploy New Crawler</DialogTitle>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Crawler Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter crawler name..." 
                                className="bg-game-bg border-game-border text-white"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="classId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Crawler Class</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger className="bg-game-bg border-game-border text-white">
                                  <SelectValue placeholder="Select a class" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-game-surface border-game-border">
                                {crawlerClasses?.map((cls) => (
                                  <SelectItem key={cls.id} value={cls.id.toString()}>
                                    {cls.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateDialogOpen(false)}
                          className="border-game-border text-slate-300 hover:bg-game-bg"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createCrawlerMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {createCrawlerMutation.isPending ? (
                            <>
                              <i className="fas fa-spinner fa-spin mr-2"></i>
                              Deploying...
                            </>
                          ) : (
                            "Deploy Crawler"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Active Crawlers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {crawlersLoading ? (
                // Loading skeletons
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-game-surface rounded-xl p-6 border border-game-border">
                    <div className="animate-pulse">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-game-bg rounded-lg"></div>
                        <div className="space-y-2">
                          <div className="h-4 bg-game-bg rounded w-24"></div>
                          <div className="h-3 bg-game-bg rounded w-20"></div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-3 bg-game-bg rounded"></div>
                        <div className="h-3 bg-game-bg rounded"></div>
                        <div className="h-3 bg-game-bg rounded"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : crawlers && crawlers.length > 0 ? (
                crawlers.map((crawler) => (
                  <CrawlerCard key={crawler.id} crawler={crawler} />
                ))
              ) : (
                <div className="col-span-full bg-game-surface rounded-xl p-8 border border-game-border text-center">
                  <i className="fas fa-user-plus text-4xl text-slate-400 mb-4"></i>
                  <h3 className="text-xl font-semibold text-white mb-2">No Crawlers Deployed</h3>
                  <p className="text-slate-400 mb-4">
                    Deploy your first crawler to begin exploring the dungeon depths.
                  </p>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Deploy First Crawler
                  </Button>
                </div>
              )}
            </div>

            {/* Stats and Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ActivityFeed activities={activities} isLoading={activitiesLoading} />
              </div>
              
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-game-surface rounded-xl p-6 border border-game-border">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                      <i className="fas fa-heart mr-2"></i>
                      Buy Health Packs
                    </Button>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      <i className="fas fa-arrow-up mr-2"></i>
                      Upgrade Equipment
                    </Button>
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <i className="fas fa-user-plus mr-2"></i>
                      Recruit Crawler
                    </Button>
                  </div>
                </div>

                {/* Market Highlights */}
                <div className="bg-game-surface rounded-xl p-6 border border-game-border">
                  <h3 className="text-lg font-semibold text-white mb-4">Market Highlights</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">Plasma Rifle Mk-III</p>
                        <p className="text-xs text-slate-400">+25 Attack, +10 Tech</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-green-400">2,450 cr</p>
                        <p className="text-xs text-slate-400">3 available</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">Nano-Armor Vest</p>
                        <p className="text-xs text-slate-400">+30 Defense, +5 Speed</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-green-400">1,890 cr</p>
                        <p className="text-xs text-slate-400">7 available</p>
                      </div>
                    </div>
                    <Button className="w-full bg-gray-700 hover:bg-gray-600 text-white">
                      View All Items
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Panel */}
        <aside className="w-80 bg-game-surface border-l border-game-border hidden xl:block">
          <div className="h-1/2 border-b border-game-border">
            <ChatPanel />
          </div>
          <div className="h-1/2">
            <Leaderboard />
          </div>
        </aside>
      </div>

      <MobileMenu />
    </div>
  );
}
