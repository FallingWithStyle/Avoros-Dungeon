/**
 * File: landing.tsx
 * Responsibility: Landing page for unauthenticated users showcasing game features and encouraging registration
 * Notes: Displays game overview, features, crawler classes, and call-to-action for establishing a corporation
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-gray-900 to-black text-slate-100 overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-red-600 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-600 rounded-full filter blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="mb-6">
              <Badge className="bg-red-600/20 text-red-400 border-red-500/50 mb-4 text-sm px-3 py-1 animate-pulse">
                CORPORATE DEATH MATCH • SEASON 1 ACTIVE
              </Badge>
              <h1 className="text-7xl md:text-8xl font-black text-transparent bg-gradient-to-r from-red-500 via-orange-500 to-red-600 bg-clip-text mb-4 tracking-tight">
                AVOROS DUNGEON
              </h1>
              <div className="text-2xl md:text-3xl font-bold text-red-400 mb-2 tracking-wide">
                CORPORATE CRAWLER CONSORTIUM
              </div>
              <div className="text-lg md:text-xl text-slate-300 font-medium max-w-3xl mx-auto leading-relaxed">
                WHERE AMBITION MEETS ANNIHILATION
              </div>
            </div>

            {/* Tagline */}
            <div className="bg-gradient-to-r from-gray-900/80 via-red-900/40 to-gray-900/80 backdrop-blur-sm border border-red-500/30 rounded-lg p-6 mb-8 max-w-4xl mx-auto">
              <p className="text-xl md:text-2xl font-bold text-red-300 mb-2">
                "PROFIT THROUGH PERIL. EXPAND THROUGH EXTINCTION."
              </p>
              <p className="text-slate-400 text-lg">
                Your corporation's survival depends on one elite crawler. They
                die, you start over. Welcome to corporate natural selection.
              </p>
            </div>
          </div>

          {/* Core Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-gradient-to-br from-red-950/50 to-gray-900/50 border-red-500/30 backdrop-blur-sm hover:border-red-400/50 transition-all duration-300 hover:scale-105">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center justify-center text-xl">
                  <i className="fas fa-building-columns mr-3 text-2xl"></i>
                  CORPORATE DOMINANCE
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-slate-300 leading-relaxed">
                  Lead a ruthless mega-corporation. Sponsor ONE elite crawler
                  for the most profitable venture in human history:{" "}
                  <span className="text-red-400 font-bold">
                    monetized death sport
                  </span>
                  .
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-950/50 to-gray-900/50 border-orange-500/30 backdrop-blur-sm hover:border-orange-400/50 transition-all duration-300 hover:scale-105">
              <CardHeader>
                <CardTitle className="text-orange-400 flex items-center justify-center text-xl">
                  <i className="fas fa-skull-crossbones mr-3 text-2xl"></i>
                  SURVIVE OR LIQUIDATE
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-slate-300 leading-relaxed">
                  Your crawler is your{" "}
                  <span className="text-orange-400 font-bold">only asset</span>.
                  Death means bankruptcy. Failure means starting over. No
                  respawns, no second chances.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-950/50 to-gray-900/50 border-cyan-500/30 backdrop-blur-sm hover:border-cyan-400/50 transition-all duration-300 hover:scale-105">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center justify-center text-xl">
                  <i className="fas fa-trophy mr-3 text-2xl"></i>
                  MARKET SUPREMACY
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-slate-300 leading-relaxed">
                  Crush competing corporations. Corner the{" "}
                  <span className="text-cyan-400 font-bold">death market</span>.
                  Build your empire on the bones of failed crawlers.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="text-center mb-12">
            <Button
              size="lg"
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-12 py-6 text-xl font-bold border-2 border-red-500 shadow-lg shadow-red-500/25 hover:shadow-red-400/40 transition-all duration-300 hover:scale-105"
              onClick={() => (window.location.href = "/api/login")}
            >
              <i className="fas fa-briefcase mr-3"></i>
              ESTABLISH YOUR EMPIRE
            </Button>

            <p className="text-slate-400 mt-4 text-lg">
              Register your corporation and begin{" "}
              <span className="text-red-400 font-semibold">
                profitable elimination operations
              </span>
            </p>
          </div>

          {/* Game Systems */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="bg-gradient-to-br from-gray-900/70 to-black/70 border-gray-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white mb-4 flex items-center">
                  <i className="fas fa-cogs mr-3 text-red-400"></i>
                  CORPORATE SYSTEMS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-slate-300">
                    <i className="fas fa-sword text-red-400 mr-3 w-5"></i>
                    <span className="font-semibold text-red-300">
                      Tactical Combat Matrix
                    </span>{" "}
                    - Turn-based liquidation protocols
                  </div>
                  <div className="flex items-center text-slate-300">
                    <i className="fas fa-shopping-cart text-orange-400 mr-3 w-5"></i>
                    <span className="font-semibold text-orange-300">
                      Equipment Monopoly
                    </span>{" "}
                    - Corner the death-dealing market
                  </div>
                  <div className="flex items-center text-slate-300">
                    <i className="fas fa-satellite-dish text-cyan-400 mr-3 w-5"></i>
                    <span className="font-semibold text-cyan-300">
                      Corporate Communications
                    </span>{" "}
                    - Real-time command protocols
                  </div>
                  <div className="flex items-center text-slate-300">
                    <i className="fas fa-chart-line text-green-400 mr-3 w-5"></i>
                    <span className="font-semibold text-green-300">
                      Profit Optimization
                    </span>{" "}
                    - Persistent wealth accumulation
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900/70 to-black/70 border-gray-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white mb-4 flex items-center">
                  <i className="fas fa-users mr-3 text-red-400"></i>
                  CRAWLER CLASSIFICATIONS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-slate-300">
                    <i className="fas fa-fist-raised text-red-400 mr-3 w-5"></i>
                    <span className="font-semibold text-red-300">
                      Combat Veteran
                    </span>{" "}
                    - Engineered for maximum violence
                  </div>
                  <div className="flex items-center text-slate-300">
                    <i className="fas fa-microchip text-blue-400 mr-3 w-5"></i>
                    <span className="font-semibold text-blue-300">
                      Tech Specialist
                    </span>{" "}
                    - Corporate espionage & digital warfare
                  </div>
                  <div className="flex items-center text-slate-300">
                    <i className="fas fa-user-ninja text-purple-400 mr-3 w-5"></i>
                    <span className="font-semibold text-purple-300">
                      Stealth Operative
                    </span>{" "}
                    - Silent elimination protocols
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warning Disclaimer */}
          <div className="bg-gradient-to-r from-red-900/30 via-red-800/20 to-red-900/30 border-2 border-red-500/50 rounded-lg p-6 mb-8">
            <div className="text-center">
              <i className="fas fa-exclamation-triangle text-red-400 text-3xl mb-3"></i>
              <h3 className="text-xl font-bold text-red-300 mb-2">
                CORPORATE LIABILITY WAIVER
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed max-w-4xl mx-auto">
                By establishing your corporation, you acknowledge that crawler
                death is permanent, corporate bankruptcy is final, and the
                Avoros Dungeon Consortium is not liable for emotional trauma,
                financial ruin, or existential crisis resulting from repeated
                crawler liquidation events.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-slate-500 text-sm">
            <p>Avoros Dungeon Corporate Crawler Consortium™</p>
            <p className="mt-1">
              "Maximizing Shareholder Value Through Strategic Mortality"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
