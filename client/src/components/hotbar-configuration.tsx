
/**
 * File: hotbar-configuration.tsx
 * Responsibility: Allows customization of tactical hotbar layout and abilities
 * Notes: Provides drag-and-drop interface for organizing hotbar slots and selecting abilities
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Move, Sword, Shield, Zap, Plus, X, RotateCcw } from 'lucide-react';

interface HotbarSlot {
  id: string;
  actionId: string;
  actionName: string;
  actionType: 'move' | 'attack' | 'ability';
  icon: React.ReactNode;
  hotkey: string;
}

interface HotbarConfigurationProps {
  onConfigurationChange: (config: HotbarSlot[]) => void;
}

const AVAILABLE_ACTIONS = [
  { id: 'move', name: 'Move', type: 'move', icon: <Move className="w-4 h-4" /> },
  { id: 'basic_attack', name: 'Attack', type: 'attack', icon: <Sword className="w-4 h-4" /> },
  { id: 'defend', name: 'Defend', type: 'ability', icon: <Shield className="w-4 h-4" /> },
  { id: 'special', name: 'Special', type: 'ability', icon: <Zap className="w-4 h-4" /> },
] as const;

const DEFAULT_HOTKEYS = ['W', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function HotbarConfiguration({ onConfigurationChange }: HotbarConfigurationProps) {
  const [hotbarSlots, setHotbarSlots] = useState<HotbarSlot[]>([
    { id: '1', actionId: 'move', actionName: 'Move', actionType: 'move', icon: <Move className="w-4 h-4" />, hotkey: 'W' },
    { id: '2', actionId: 'basic_attack', actionName: 'Attack', actionType: 'attack', icon: <Sword className="w-4 h-4" />, hotkey: '1' },
    { id: '3', actionId: 'defend', actionName: 'Defend', actionType: 'ability', icon: <Shield className="w-4 h-4" />, hotkey: '2' },
    { id: '4', actionId: 'special', actionName: 'Special', actionType: 'ability', icon: <Zap className="w-4 h-4" />, hotkey: '3' },
  ]);

  const [maxSlots, setMaxSlots] = useState(4);

  const updateSlotAction = (slotId: string, actionId: string) => {
    const action = AVAILABLE_ACTIONS.find(a => a.id === actionId);
    if (!action) return;

    setHotbarSlots(prev => prev.map(slot => 
      slot.id === slotId 
        ? { ...slot, actionId: action.id, actionName: action.name, actionType: action.type as any, icon: action.icon }
        : slot
    ));
  };

  const addSlot = () => {
    if (hotbarSlots.length >= 10) return;
    
    const newSlot: HotbarSlot = {
      id: `${hotbarSlots.length + 1}`,
      actionId: 'move',
      actionName: 'Move',
      actionType: 'move',
      icon: <Move className="w-4 h-4" />,
      hotkey: DEFAULT_HOTKEYS[hotbarSlots.length] || `${hotbarSlots.length + 1}`,
    };
    
    setHotbarSlots(prev => [...prev, newSlot]);
  };

  const removeSlot = (slotId: string) => {
    if (hotbarSlots.length <= 1) return;
    setHotbarSlots(prev => prev.filter(slot => slot.id !== slotId));
  };

  const resetToDefault = () => {
    setHotbarSlots([
      { id: '1', actionId: 'move', actionName: 'Move', actionType: 'move', icon: <Move className="w-4 h-4" />, hotkey: 'W' },
      { id: '2', actionId: 'basic_attack', actionName: 'Attack', actionType: 'attack', icon: <Sword className="w-4 h-4" />, hotkey: '1' },
      { id: '3', actionId: 'defend', actionName: 'Defend', actionType: 'ability', icon: <Shield className="w-4 h-4" />, hotkey: '2' },
      { id: '4', actionId: 'special', actionName: 'Special', actionType: 'ability', icon: <Zap className="w-4 h-4" />, hotkey: '3' },
    ]);
    setMaxSlots(4);
  };

  React.useEffect(() => {
    onConfigurationChange(hotbarSlots.slice(0, maxSlots));
  }, [hotbarSlots, maxSlots, onConfigurationChange]);

  return (
    <Card className="bg-game-panel border-game-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-200 flex items-center justify-between">
          Hotbar Configuration
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Max Slots Setting */}
        <div className="space-y-2">
          <Label htmlFor="maxSlots">Maximum Visible Slots: {maxSlots}</Label>
          <input
            id="maxSlots"
            type="range"
            min="1"
            max="10"
            value={maxSlots}
            onChange={(e) => setMaxSlots(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>10</span>
          </div>
        </div>

        {/* Hotbar Preview */}
        <div className="space-y-2">
          <Label>Hotbar Preview</Label>
          <div className="flex gap-1 p-2 bg-game-surface rounded-lg border border-game-border">
            {hotbarSlots.slice(0, maxSlots).map((slot) => (
              <div
                key={slot.id}
                className="w-10 h-10 border border-gray-600 rounded flex flex-col items-center justify-center bg-gray-800"
                title={`${slot.actionName} [${slot.hotkey}]`}
              >
                {slot.icon}
                <span className="text-xs text-muted-foreground">{slot.hotkey}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Slot Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Slot Configuration</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addSlot}
              disabled={hotbarSlots.length >= 10}
              className="flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Slot
            </Button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {hotbarSlots.map((slot, index) => (
              <div
                key={slot.id}
                className={`flex items-center gap-2 p-2 rounded border ${
                  index < maxSlots ? 'border-green-600 bg-green-950/20' : 'border-gray-600 bg-gray-950/20'
                }`}
              >
                <div className="w-8 h-8 flex flex-col items-center justify-center border border-gray-600 rounded bg-gray-800">
                  {slot.icon}
                  <span className="text-xs">{slot.hotkey}</span>
                </div>
                
                <div className="flex-1">
                  <Select
                    value={slot.actionId}
                    onValueChange={(value) => updateSlotAction(slot.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ACTIONS.map((action) => (
                        <SelectItem key={action.id} value={action.id}>
                          <div className="flex items-center gap-2">
                            {action.icon}
                            {action.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <span className="text-xs text-muted-foreground min-w-12">
                  {index < maxSlots ? 'Visible' : 'Hidden'}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeSlot(slot.id)}
                  disabled={hotbarSlots.length <= 1}
                  className="p-1 h-8 w-8"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• Drag slots to reorder them (coming soon)</p>
          <p>• Green slots are visible in the tactical view</p>
          <p>• Use the slider to control how many slots appear</p>
        </div>
      </CardContent>
    </Card>
  );
}
