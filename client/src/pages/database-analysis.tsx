
/**
 * File: database-analysis.tsx
 * Responsibility: Dedicated page for analyzing database storage usage and cleanup recommendations
 * Notes: Provides detailed database size analysis with breakdown by tables and recommendations
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, HardDrive, Lock } from "lucide-react";
import { DatabaseSizeAnalyzer } from "@/components/database-size-analyzer";

// Check if debug mode is enabled
const IS_DEBUG_MODE = import.meta.env.DEV || 
                     import.meta.env.VITE_DEBUG === "true" ||
                     typeof window !== "undefined" && window.location.hostname.includes("replit");

export default function DatabaseAnalysis() {
  // If not in debug mode, show access denied message
  if (!IS_DEBUG_MODE) {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center">
        <Card className="border-red-600/30 bg-black/40 backdrop-blur-sm max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-300">
              <Lock className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-200/70 text-sm">
              Database analysis is only available in debug mode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-game-bg">
      <div className="container mx-auto max-w-4xl p-6 space-y-6">
        {/* Header */}
        <Card className="border-amber-600/30 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-300">
              <Database className="w-5 h-5" />
              Database Storage Analysis
            </CardTitle>
            <p className="text-amber-200/70 text-sm">
              Analyze your database storage usage and get recommendations for optimization.
            </p>
          </CardHeader>
        </Card>

        {/* Database Size Analyzer */}
        <Card className="border-blue-600/30 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-300">
              <HardDrive className="w-5 h-5" />
              Storage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DatabaseSizeAnalyzer />
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="border-gray-600/30 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-gray-300 text-sm">Storage Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-400 space-y-2">
            <p>• <strong>Sessions:</strong> User login sessions - automatically cleaned up when expired</p>
            <p>• <strong>Activities:</strong> Game activity logs - consider archiving old entries</p>
            <p>• <strong>Crawler Positions:</strong> Movement history - can be pruned for inactive crawlers</p>
            <p>• <strong>Tactical Positions:</strong> Combat positioning data - cleaned up after combat ends</p>
            <p>• <strong>Mobs:</strong> Monster/creature data - core game data, should not be deleted</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
