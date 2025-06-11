
/**
 * File: useLayoutSettings.ts
 * Responsibility: Manages layout settings including hotbar position, count, and saved templates
 * Notes: Handles persistence to localStorage and provides template management functionality
 */

import { useState, useEffect, useCallback } from 'react';

export type HotbarPosition = 'top' | 'bottom' | 'left' | 'right';

export interface LayoutSettings {
  hotbarCount: number;
  hotbarPosition: HotbarPosition;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  settings: LayoutSettings;
  createdAt: Date;
}

const DEFAULT_SETTINGS: LayoutSettings = {
  hotbarCount: 4,
  hotbarPosition: 'bottom'
};

const STORAGE_KEY = 'tacticalLayoutSettings';
const TEMPLATES_KEY = 'tacticalLayoutTemplates';

export function useLayoutSettings() {
  const [currentSettings, setCurrentSettings] = useState<LayoutSettings>(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState<LayoutTemplate[]>([]);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setCurrentSettings(parsed);
      }

      const savedTemplates = localStorage.getItem(TEMPLATES_KEY);
      if (savedTemplates) {
        const parsed = JSON.parse(savedTemplates);
        // Convert date strings back to Date objects
        const templatesWithDates = parsed.map((template: any) => ({
          ...template,
          createdAt: new Date(template.createdAt)
        }));
        setTemplates(templatesWithDates);
      }
    } catch (error) {
      console.error('Failed to load layout settings:', error);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = useCallback((settings: LayoutSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setCurrentSettings(settings);
    } catch (error) {
      console.error('Failed to save layout settings:', error);
    }
  }, []);

  // Update individual setting
  const updateSetting = useCallback(<K extends keyof LayoutSettings>(
    key: K,
    value: LayoutSettings[K]
  ) => {
    const newSettings = { ...currentSettings, [key]: value };
    saveSettings(newSettings);
  }, [currentSettings, saveSettings]);

  // Save current settings as a template
  const saveTemplate = useCallback((name: string) => {
    const newTemplate: LayoutTemplate = {
      id: Date.now().toString(),
      name: name.trim(),
      settings: { ...currentSettings },
      createdAt: new Date()
    };

    const updatedTemplates = [...templates, newTemplate];
    
    // Keep only the 3 most recent templates
    if (updatedTemplates.length > 3) {
      updatedTemplates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      updatedTemplates.splice(3);
    }

    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updatedTemplates));
      setTemplates(updatedTemplates);
      return true;
    } catch (error) {
      console.error('Failed to save template:', error);
      return false;
    }
  }, [currentSettings, templates]);

  // Load a template
  const loadTemplate = useCallback((templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      saveSettings(template.settings);
      return true;
    }
    return false;
  }, [templates, saveSettings]);

  // Delete a template
  const deleteTemplate = useCallback((templateId: string) => {
    const updatedTemplates = templates.filter(t => t.id !== templateId);
    try {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(updatedTemplates));
      setTemplates(updatedTemplates);
      return true;
    } catch (error) {
      console.error('Failed to delete template:', error);
      return false;
    }
  }, [templates]);

  // Reset to default settings
  const resetToDefaults = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  return {
    currentSettings,
    templates,
    updateSetting,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    resetToDefaults,
    canSaveMore: templates.length < 3
  };
}
