
/**
 * File: layout-settings-panel.tsx
 * Responsibility: Layout settings configuration interface
 * Notes: Provides UI for users to customize layout preferences
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLayoutSettings, type LayoutDensity, type PanelLayout } from "@/hooks/useLayoutSettings";
import { RotateCcw, Layout, Grid, Sidebar, Columns, Minimize2, Maximize2, Square } from "lucide-react";

export function LayoutSettingsPanel() {
  const { settings, updateSetting, resetSettings } = useLayoutSettings();

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Layout Settings
        </CardTitle>
        <CardDescription>
          Customize the layout and appearance of your interface
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Density Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Display Density</Label>
          <Select
            value={settings.density}
            onValueChange={(value: LayoutDensity) => updateSetting("density", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">
                <div className="flex items-center gap-2">
                  <Minimize2 className="h-4 w-4" />
                  Compact
                </div>
              </SelectItem>
              <SelectItem value="comfortable">
                <div className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Comfortable
                </div>
              </SelectItem>
              <SelectItem value="spacious">
                <div className="flex items-center gap-2">
                  <Maximize2 className="h-4 w-4" />
                  Spacious
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Panel Layout */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Panel Layout</Label>
          <Select
            value={settings.panelLayout}
            onValueChange={(value: PanelLayout) => updateSetting("panelLayout", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Default
                </div>
              </SelectItem>
              <SelectItem value="sidebar">
                <div className="flex items-center gap-2">
                  <Sidebar className="h-4 w-4" />
                  Sidebar
                </div>
              </SelectItem>
              <SelectItem value="grid">
                <div className="flex items-center gap-2">
                  <Grid className="h-4 w-4" />
                  Grid
                </div>
              </SelectItem>
              <SelectItem value="columns">
                <div className="flex items-center gap-2">
                  <Columns className="h-4 w-4" />
                  Columns
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Panel Visibility */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Panel Visibility</Label>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-minimap" className="text-sm">Show Mini Map</Label>
              <Switch
                id="show-minimap"
                checked={settings.showMiniMap}
                onCheckedChange={(checked) => updateSetting("showMiniMap", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-action-queue" className="text-sm">Show Action Queue</Label>
              <Switch
                id="show-action-queue"
                checked={settings.showActionQueue}
                onCheckedChange={(checked) => updateSetting("showActionQueue", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-status-panel" className="text-sm">Show Status Panel</Label>
              <Switch
                id="show-status-panel"
                checked={settings.showStatusPanel}
                onCheckedChange={(checked) => updateSetting("showStatusPanel", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sidebar-collapsed" className="text-sm">Collapse Sidebar</Label>
              <Switch
                id="sidebar-collapsed"
                checked={settings.sidebarCollapsed}
                onCheckedChange={(checked) => updateSetting("sidebarCollapsed", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enable-animations" className="text-sm">Enable Animations</Label>
              <Switch
                id="enable-animations"
                checked={settings.enableAnimations}
                onCheckedChange={(checked) => updateSetting("enableAnimations", checked)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Grid Size */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Grid Size: {settings.gridSize}</Label>
          <Slider
            value={[settings.gridSize]}
            onValueChange={([value]) => updateSetting("gridSize", value)}
            min={8}
            max={16}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Smaller</span>
            <span>Larger</span>
          </div>
        </div>

        <Separator />

        {/* Reset Button */}
        <div className="flex justify-end">
          <Button onClick={resetSettings} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
