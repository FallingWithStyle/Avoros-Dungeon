
/**
 * File: layoutUtils.ts
 * Responsibility: Layout utility functions for applying layout settings
 * Notes: Provides CSS classes and styles based on layout settings
 */

import { type LayoutSettings } from "@/hooks/useLayoutSettings";
import { cn } from "@/lib/utils";

export function getDensityClasses(density: string): string {
  switch (density) {
    case "compact":
      return "p-1 gap-1 text-sm";
    case "spacious":
      return "p-6 gap-6 text-base";
    default: // comfortable
      return "p-4 gap-4 text-sm";
  }
}

export function getPanelLayoutClasses(layout: string): string {
  switch (layout) {
    case "sidebar":
      return "flex flex-row";
    case "grid":
      return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    case "columns":
      return "flex flex-col lg:flex-row";
    default: // default
      return "flex flex-col";
  }
}

export function getGridSizeClasses(size: number): string {
  return `grid-cols-${Math.min(Math.max(size, 1), 12)}`;
}

export function getLayoutClasses(settings: LayoutSettings): {
  container: string;
  panel: string;
  content: string;
} {
  const density = getDensityClasses(settings.density);
  const layout = getPanelLayoutClasses(settings.panelLayout);
  
  return {
    container: cn(
      layout,
      density,
      settings.enableAnimations && "transition-all duration-200",
      settings.sidebarCollapsed && "lg:pl-16"
    ),
    panel: cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      density,
      !settings.enableAnimations && "transition-none"
    ),
    content: cn(
      density,
      settings.enableAnimations && "transition-all duration-150"
    ),
  };
}

export function shouldShowPanel(
  panelName: keyof Pick<LayoutSettings, "showMiniMap" | "showActionQueue" | "showStatusPanel">,
  settings: LayoutSettings
): boolean {
  return settings[panelName];
}
