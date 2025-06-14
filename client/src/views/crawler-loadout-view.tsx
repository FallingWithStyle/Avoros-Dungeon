
/**
 * File: crawler-loadout-view.tsx
 * Responsibility: Main view for crawler equipment management and customization
 * Notes: Handles equipment slots, inventory management, stat optimization, and loadout presets
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Sword, Shield, Gem, Package, TrendingUp, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { CrawlerWithDetails } from "@shared/schema";

interface CrawlerLoadoutViewProps {
  crawlerId: string;
}

export default function CrawlerLoadoutView({ crawlerId }: CrawlerLoadoutViewProps) {
  const { toast } = useToast();

  const { data: crawler, isLoading, error } = useQuery<CrawlerWithDetails>({
    queryKey: ["crawler", crawlerId],
    queryFn: async () => {
      const response = await fetch(`/api/crawlers/${crawlerId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch crawler");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading crawler loadout...</p>
        </div>
      </div>
    );
  }

  if (error || !crawler) {
    return (
      <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load crawler loadout</p>
          <Link href={`/crawler/${crawlerId}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Crawler
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const equipmentSlots = [
    { id: 'weapon', name: 'Primary Weapon', icon: Sword, equipped: null },
    { id: 'armor', name: 'Body Armor', icon: Shield, equipped: null },
    { id: 'accessory', name: 'Accessory', icon: Gem, equipped: null },
  ];

  const statCalculations = {
    totalAttack: crawler.might + (crawler.attack || 0),
    totalDefense: crawler.endurance + (crawler.defense || 0),
    totalSpeed: crawler.agility,
    totalAccuracy: crawler.wisdom + crawler.intellect,
  };

  return (
    <div className="min-h-screen bg-game-bg text-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href={`/crawler/${crawlerId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Loadout & Equipment</h1>
              <p className="text-slate-400">
                {crawler.name} • Level {crawler.level} • Serial #{crawler.serial}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-crawler/20 text-crawler border-crawler">
              {crawler.class.name}
            </Badge>
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">
              Floor {crawler.currentFloor}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="equipment" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-game-surface">
            <TabsTrigger value="equipment" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Equipment</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Stats</span>
            </TabsTrigger>
            <TabsTrigger value="loadouts" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Loadouts</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Inventory</span>
            </TabsTrigger>
          </TabsList>

          {/* Equipment Tab */}
          <TabsContent value="equipment" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Equipment Slots */}
              <Card className="bg-game-surface border-game-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Package className="h-5 w-5 mr-2 text-blue-400" />
                    Equipment Slots
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {equipmentSlots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="flex items-center space-x-3">
                        <slot.icon className="h-6 w-6 text-slate-400" />
                        <div>
                          <p className="font-medium text-white">{slot.name}</p>
                          <p className="text-sm text-slate-400">
                            {slot.equipped ? slot.equipped : "No equipment"}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        {slot.equipped ? "Change" : "Equip"}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-game-surface border-game-border">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                    Combat Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Total Attack</span>
                      <span className="font-bold text-red-400">{statCalculations.totalAttack}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Total Defense</span>
                      <span className="font-bold text-blue-400">{statCalculations.totalDefense}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Speed</span>
                      <span className="font-bold text-yellow-400">{statCalculations.totalSpeed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Accuracy</span>
                      <span className="font-bold text-purple-400">{statCalculations.totalAccuracy}</span>
                    </div>
                  </div>
                  <Separator className="bg-slate-700" />
                  <div className="text-center">
                    <p className="text-sm text-slate-400 mb-2">Equipment Power Rating</p>
                    <div className="text-2xl font-bold text-orange-400">0 / 100</div>
                    <Progress value={0} className="w-full mt-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Base Stats */}
              <Card className="bg-game-surface border-game-border">
                <CardHeader>
                  <CardTitle className="text-white">Base Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-slate-800 rounded">
                      <p className="text-sm text-slate-400">Might</p>
                      <p className="text-xl font-bold text-red-400">{crawler.might}</p>
                    </div>
                    <div className="text-center p-3 bg-slate-800 rounded">
                      <p className="text-sm text-slate-400">Agility</p>
                      <p className="text-xl font-bold text-yellow-400">{crawler.agility}</p>
                    </div>
                    <div className="text-center p-3 bg-slate-800 rounded">
                      <p className="text-sm text-slate-400">Endurance</p>
                      <p className="text-xl font-bold text-blue-400">{crawler.endurance}</p>
                    </div>
                    <div className="text-center p-3 bg-slate-800 rounded">
                      <p className="text-sm text-slate-400">Intellect</p>
                      <p className="text-xl font-bold text-purple-400">{crawler.intellect}</p>
                    </div>
                    <div className="text-center p-3 bg-slate-800 rounded">
                      <p className="text-sm text-slate-400">Charisma</p>
                      <p className="text-xl font-bold text-pink-400">{crawler.charisma}</p>
                    </div>
                    <div className="text-center p-3 bg-slate-800 rounded">
                      <p className="text-sm text-slate-400">Wisdom</p>
                      <p className="text-xl font-bold text-green-400">{crawler.wisdom}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Derived Stats */}
              <Card className="bg-game-surface border-game-border">
                <CardHeader>
                  <CardTitle className="text-white">Derived Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-800 rounded">
                      <span className="text-slate-300">Health</span>
                      <span className="font-bold text-green-400">{crawler.health} / {crawler.maxHealth}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-800 rounded">
                      <span className="text-slate-300">Energy</span>
                      <span className="font-bold text-blue-400">{crawler.energy} / {crawler.maxEnergy}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-800 rounded">
                      <span className="text-slate-300">Power</span>
                      <span className="font-bold text-purple-400">{crawler.power} / {crawler.maxPower}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-800 rounded">
                      <span className="text-slate-300">Luck</span>
                      <span className="font-bold text-orange-400">{crawler.luck}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Loadouts Tab */}
          <TabsContent value="loadouts" className="space-y-6">
            <Card className="bg-game-surface border-game-border">
              <CardHeader>
                <CardTitle className="text-white">Equipment Loadouts</CardTitle>
                <p className="text-slate-400">Save and switch between different equipment configurations</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">No saved loadouts yet</p>
                  <Button variant="outline">Create New Loadout</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card className="bg-game-surface border-game-border">
              <CardHeader>
                <CardTitle className="text-white">Equipment Inventory</CardTitle>
                <p className="text-slate-400">Manage your collected equipment and items</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 mb-4">No equipment found</p>
                  <p className="text-sm text-slate-500">Equipment will appear here as you find it in the dungeon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
