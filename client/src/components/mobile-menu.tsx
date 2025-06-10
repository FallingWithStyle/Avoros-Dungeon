/**
 * File: mobile-menu.tsx
 * Responsibility: Provides a mobile-friendly navigation menu using a slide-out sheet
 */
import React, { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Menu, Home, Settings, LogOut, User } from "lucide-react";

export default function MobileMenu() {
  const handleNavigation = (section: string) => {
    // Scroll to section or toggle visibility
    const element = document.querySelector(`[data-section="${section}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-game-surface/95 backdrop-blur-sm border-t border-game-border z-50 safe-area-pb">
      <div className="flex justify-around py-2 px-2">
        <button
          onClick={() => handleNavigation('tactical')}
          className="flex flex-col items-center p-2 min-w-0 flex-1 text-blue-400 hover:text-blue-300 active:bg-blue-400/10 rounded transition-colors"
        >
          <i className="fas fa-crosshairs text-lg"></i>
          <span className="text-xs mt-1 truncate">Combat</span>
        </button>

        <button
          onClick={() => handleNavigation('status')}
          className="flex flex-col items-center p-2 min-w-0 flex-1 text-green-400 hover:text-green-300 active:bg-green-400/10 rounded transition-colors"
        >
          <i className="fas fa-heart text-lg"></i>
          <span className="text-xs mt-1 truncate">Status</span>
        </button>

        <button
          onClick={() => {
            const mapDetails = document.querySelector('details:has([data-section="map"])');
            if (mapDetails) mapDetails.toggleAttribute('open');
          }}
          className="flex flex-col items-center p-2 min-w-0 flex-1 text-amber-400 hover:text-amber-300 active:bg-amber-400/10 rounded transition-colors"
        >
          <i className="fas fa-map text-lg"></i>
          <span className="text-xs mt-1 truncate">Map</span>
        </button>

        <button
          onClick={() => {
            const eventsDetails = document.querySelector('details:has([data-section="events"])');
            if (eventsDetails) eventsDetails.toggleAttribute('open');
          }}
          className="flex flex-col items-center p-2 min-w-0 flex-1 text-purple-400 hover:text-purple-300 active:bg-purple-400/10 rounded transition-colors"
        >
          <i className="fas fa-history text-lg"></i>
          <span className="text-xs mt-1 truncate">Events</span>
        </button>
      </div>
    </div>
  );
}