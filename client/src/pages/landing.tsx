/**
 * File: landing.tsx
 * Responsibility: Landing page for unauthenticated users showcasing game features and encouraging registration
 * Notes: Displays game overview, features, crawler classes, and call-to-action for establishing a corporation
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-game-bg text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-blue-400 mb-4">
            <i className="fas fa-dungeon mr-4"></i>
            Avoros Dungeon
          </h1>
          <p className="text-xl text-slate-300 mb-2">
            Corporate Crawler Consortium
          </p>
          <p className="text-lg text-slate-400">
            Lead your corporation. Sponsor a crawler. Claim the depths.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-game-surface border-game-border">
            <CardHeader>
              <CardTitle className="text-sponsor flex items-center justify-center">
                <i className="fas fa-building mr-2"></i>
                Corporate Leadership
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                Lead a powerful corporation and sponsor a single elite crawler
                for the most dangerous corporate venture - dungeon exploration.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-game-surface border-game-border">
            <CardHeader>
              <CardTitle className="text-crawler flex items-center justify-center">
                <i className="fas fa-user-ninja mr-2"></i>
                Crawl & Survive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                Your corporation gets one shot - sponsor a single crawler through
                deadly encounters and exploration. Death means starting over.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-game-surface border-game-border">
            <CardHeader>
              <CardTitle className="text-green-400 flex items-center justify-center">
                <i className="fas fa-trophy mr-2"></i>
                Compete & Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300">
                Compete with other corporations, trade resources, and build your
                corporate reputation as the premier dungeon exploration enterprise.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
            onClick={() => window.location.href = "/api/login"}
          >
            <i className="fas fa-building mr-2"></i>
            Establish Your Corporation
          </Button>

          <p className="text-sm text-slate-400">
            Register your corporation and begin crawler operations
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Game Features</h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center">
                <i className="fas fa-sword text-red-400 mr-2"></i>
                Turn-based combat system
              </li>
              <li className="flex items-center">
                <i className="fas fa-store text-green-400 mr-2"></i>
                Equipment marketplace
              </li>
              <li className="flex items-center">
                <i className="fas fa-comments text-blue-400 mr-2"></i>
                Real-time command chat
              </li>
              <li className="flex items-center">
                <i className="fas fa-chart-line text-purple-400 mr-2"></i>
                Persistent progression
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Crawler Classes</h3>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-center">
                <i className="fas fa-fist-raised text-red-400 mr-2"></i>
                Combat Veteran - High attack & defense
              </li>
              <li className="flex items-center">
                <i className="fas fa-microchip text-blue-400 mr-2"></i>
                Tech Specialist - Advanced technology use
              </li>
              <li className="flex items-center">
                <i className="fas fa-eye text-purple-400 mr-2"></i>
                Stealth Operative - Speed & stealth focus
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}