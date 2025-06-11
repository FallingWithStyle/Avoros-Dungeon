
/**
 * File: useLayoutSettings.ts
 * Responsibility: Layout settings state management and persistence
 * Notes: Provides layout preferences throughout the app with localStorage persistence
 */

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type LayoutDensity = "compact" | "comfortable" | "spacious";
export type PanelLayout = "default" | "sidebar" | "grid" | "columns";
export type ThemeMode = "light" | "dark" | "auto";

export interface LayoutSettings {
  density: LayoutDensity;
  panelLayout: PanelLayout;
  showMiniMap: boolean;
  showActionQueue: boolean;
  showStatusPanel: boolean;
  sidebarCollapsed: boolean;
  gridSize: number;
  enableAnimations: boolean;
}

const defaultSettings: LayoutSettings = {
  density: "comfortable",
  panelLayout: "default",
  showMiniMap: true,
  showActionQueue: true,
  showStatusPanel: true,
  sidebarCollapsed: false,
  gridSize: 12,
  enableAnimations: true,
};

interface LayoutSettingsContextType {
  settings: LayoutSettings;
  updateSetting: <K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) => void;
  resetSettings: () => void;
}

const LayoutSettingsContext = createContext<LayoutSettingsContextType | undefined>(undefined);

export function LayoutSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LayoutSettings>(() => {
    try {
      const saved = localStorage.getItem("layout-settings");
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem("layout-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof LayoutSettings>(
    key: K,
    value: LayoutSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <LayoutSettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </LayoutSettingsContext.Provider>
  );
}

export function useLayoutSettings() {
  const context = useContext(LayoutSettingsContext);
  if (!context) {
    throw new Error("useLayoutSettings must be used within a LayoutSettingsProvider");
  }
  return context;
}
