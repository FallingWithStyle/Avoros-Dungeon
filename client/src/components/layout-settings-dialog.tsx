
/**
 * File: layout-settings-dialog.tsx
 * Responsibility: Provides UI for configuring layout settings and managing templates
 * Notes: Allows users to adjust hotbar count/position and save/load layout templates
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Save, Trash2, Upload } from 'lucide-react';
import { useLayoutSettings, type HotbarPosition } from '@/hooks/useLayoutSettings';
import { useToast } from '@/hooks/use-toast';

interface LayoutSettingsDialogProps {
  children?: React.ReactNode;
}

export default function LayoutSettingsDialog({ children }: LayoutSettingsDialogProps) {
  const {
    currentSettings,
    templates,
    updateSetting,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    resetToDefaults,
    canSaveMore
  } = useLayoutSettings();
  
  const { toast } = useToast();
  const [templateName, setTemplateName] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Template Name Required",
        description: "Please enter a name for your template.",
        variant: "destructive"
      });
      return;
    }

    if (templates.some(t => t.name.toLowerCase() === templateName.toLowerCase())) {
      toast({
        title: "Name Already Exists",
        description: "A template with this name already exists.",
        variant: "destructive"
      });
      return;
    }

    const success = saveTemplate(templateName);
    if (success) {
      setTemplateName('');
      toast({
        title: "Template Saved",
        description: `Layout template "${templateName}" has been saved.`,
      });
    } else {
      toast({
        title: "Save Failed",
        description: "Failed to save the template. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const success = loadTemplate(templateId);
      if (success) {
        toast({
          title: "Template Loaded",
          description: `Layout template "${template.name}" has been applied.`,
        });
      }
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const success = deleteTemplate(templateId);
      if (success) {
        toast({
          title: "Template Deleted",
          description: `Layout template "${template.name}" has been deleted.`,
        });
      }
    }
  };

  const positionOptions: { value: HotbarPosition; label: string }[] = [
    { value: 'top', label: 'Top' },
    { value: 'bottom', label: 'Bottom' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Layout Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Layout Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hotbar Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hotbar-count">Number of Hotkeys (1-10)</Label>
                <div className="mt-2">
                  <Slider
                    id="hotbar-count"
                    min={1}
                    max={10}
                    step={1}
                    value={[currentSettings.hotbarCount]}
                    onValueChange={(value) => updateSetting('hotbarCount', value[0])}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1</span>
                    <span className="font-medium">{currentSettings.hotbarCount}</span>
                    <span>10</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="hotbar-position">Hotbar Position</Label>
                <Select
                  value={currentSettings.hotbarPosition}
                  onValueChange={(value: HotbarPosition) => updateSetting('hotbarPosition', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {positionOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={resetToDefaults} className="w-full">
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>

          {/* Template Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Layout Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Save New Template */}
              {canSaveMore && (
                <div className="space-y-2">
                  <Label htmlFor="template-name">Save Current Layout</Label>
                  <div className="flex gap-2">
                    <Input
                      id="template-name"
                      placeholder="Enter template name..."
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveTemplate();
                        }
                      }}
                    />
                    <Button onClick={handleSaveTemplate} disabled={!templateName.trim()}>
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {!canSaveMore && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                  Maximum of 3 templates reached. Delete a template to save a new one.
                </div>
              )}

              {/* Existing Templates */}
              {templates.length > 0 && (
                <div className="space-y-2">
                  <Label>Saved Templates</Label>
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-gray-500">
                          {template.settings.hotbarCount} hotkeys • {template.settings.hotbarPosition}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadTemplate(template.id)}
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {templates.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No saved templates yet. Configure your layout and save it as a template.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
