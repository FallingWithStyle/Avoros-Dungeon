
/**
 * File: useCombatActions.ts
 * Responsibility: Handle hotbar actions, target selection, cooldowns, and attack logic for combat view
 * Notes: Extracted from combat-view-panel.tsx to improve code organization and reusability
 */

import { useState, useCallback, useEffect } from "react";
import { combatSystem } from "@shared/combat-system";
import { useToast } from "@/hooks/use-toast";

interface Equipment {
  id: string;
  name: string;
  description: string;
  type: "weapon" | "armor";
  damageAttribute: "might" | "agility";
  range: number;
  mightBonus?: number;
  agilityBonus?: number;
  defenseBonus?: number;
}

interface ActiveActionMode {
  type: "move" | "attack" | "ability";
  actionId: string;
  actionName: string;
}

interface UseCombatActionsProps {
  combatState: any;
  equippedWeapon: Equipment | null;
}

export function useCombatActions({
  combatState,
  equippedWeapon,
}: UseCombatActionsProps) {
  const { toast } = useToast();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [activeActionMode, setActiveActionMode] = useState<ActiveActionMode | null>(null);

  // Get the selected entity object
  const selectedEntity = combatState?.entities?.find(
    (e: any) => e.id === selectedTarget,
  );

  // Handle target cycling with Tab key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();

        if (!combatState?.entities) return;

        const hostileTargets = combatState.entities.filter(
          (e: any) => e.type === "hostile" && e.hp > 0,
        );

        if (hostileTargets.length === 0) {
          setSelectedTarget(null);
          return;
        }

        if (!selectedTarget) {
          setSelectedTarget(hostileTargets[0].id);
        } else {
          const currentIndex = hostileTargets.findIndex(
            (e: any) => e.id === selectedTarget,
          );
          const nextIndex = (currentIndex + 1) % hostileTargets.length;
          setSelectedTarget(hostileTargets[nextIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [combatState?.entities, selectedTarget]);

  // Handle number key hotbar actions
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle number keys when not in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case "1":
          event.preventDefault();
          handleHotbarAction("basic_attack", "attack", "Attack");
          break;
        case "2":
          event.preventDefault();
          handleHotbarAction("defend", "ability", "Defend");
          break;
        case "3":
          event.preventDefault();
          handleHotbarAction("special", "ability", "Special");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTarget, combatState?.entities, equippedWeapon]);

  // Get cooldown percentage for hotbar display
  const getCooldownPercentage = useCallback(
    (actionId: string): number => {
      const player = combatState?.entities?.find((e: any) => e.id === "player");
      if (!player || !player.cooldowns) return 0;

      const now = Date.now();
      const lastUsed = player.cooldowns[actionId] || 0;

      const cooldowns: Record<string, number> = {
        basic_attack: 800,
        defend: 3000,
        special: 5000,
      };

      const cooldown = cooldowns[actionId] || 1000;
      const timeLeft = Math.max(0, lastUsed + cooldown - now);
      return (timeLeft / cooldown) * 100;
    },
    [combatState?.entities],
  );

  // Check if an action can be used (not on cooldown)
  const canUseAction = useCallback(
    (actionId: string): boolean => {
      return getCooldownPercentage(actionId) === 0;
    },
    [getCooldownPercentage],
  );

  // Execute attack action with range and target validation
  const executeAttack = useCallback(
    (targetId?: string): boolean => {
      if (!combatState?.entities) return false;

      const player = combatState.entities.find((e: any) => e.id === "player");
      if (!player) return false;

      const target = targetId 
        ? combatState.entities.find((e: any) => e.id === targetId)
        : null;

      if (targetId && target) {
        // Validate range for targeted attack
        const weaponRange = equippedWeapon ? equippedWeapon.range * 10 : 10;
        const distance = Math.sqrt(
          Math.pow(target.position.x - player.position.x, 2) +
            Math.pow(target.position.y - player.position.y, 2),
        );

        if (distance > weaponRange) {
          toast({
            title: "Out of Range",
            description: "Target is too far away to attack",
            variant: "destructive",
          });
          return false;
        }

        // Execute targeted attack
        const success = combatSystem.executeAttack("player", targetId);
        if (success) {
          toast({
            title: "Attack Successful",
            description: "Hit " + target.name + " for damage",
          });
        }
        return success;
      } else {
        // Execute area attack or attack nearest enemy
        const success = combatSystem.executeAttack("player");
        if (success) {
          toast({
            title: "Attack",
            description: "Attacked nearby enemies",
          });
        }
        return success;
      }
    },
    [combatState?.entities, equippedWeapon, toast],
  );

  // Execute ability action
  const executeAbility = useCallback(
    (abilityId: string): boolean => {
      if (!combatState?.entities) return false;

      const player = combatState.entities.find((e: any) => e.id === "player");
      if (!player) return false;

      // Handle different ability types
      switch (abilityId) {
        case "defend":
          // Implement defend logic - reduce incoming damage for a duration
          toast({
            title: "Defending",
            description: "Defensive stance activated",
          });
          return true;

        case "special":
          // Implement special ability logic - could be class-specific
          toast({
            title: "Special Ability",
            description: "Special ability activated",
          });
          return true;

        default:
          console.warn("Unknown ability:", abilityId);
          return false;
      }
    },
    [combatState?.entities, toast],
  );

  // Main hotbar action handler
  const handleHotbarAction = useCallback(
    (actionId: string, actionType: string, actionName: string) => {
      if (!combatState?.entities) return;

      // Check cooldown
      if (!canUseAction(actionId)) {
        toast({
          title: "Action on Cooldown",
          description: actionName + " is still cooling down",
          variant: "destructive",
        });
        return;
      }

      let success = false;

      if (actionType === "attack" && actionId === "basic_attack") {
        success = executeAttack(selectedTarget || undefined);
      } else if (actionType === "ability") {
        success = executeAbility(actionId);
      }

      if (success) {
        // Clear active action mode after successful execution
        setActiveActionMode(null);
      }
    },
    [selectedTarget, combatState?.entities, canUseAction, executeAttack, executeAbility, toast],
  );

  // Handle direct target selection (clicking on entities)
  const handleTargetSelection = useCallback(
    (entityId: string) => {
      if (!combatState?.entities) return;

      const entity = combatState.entities.find((e: any) => e.id === entityId);
      if (!entity || entity.id === "player" || entity.hp <= 0) {
        return;
      }

      setSelectedTarget(entityId);
    },
    [combatState?.entities],
  );

  // Clear target selection
  const clearTarget = useCallback(() => {
    setSelectedTarget(null);
  }, []);

  // Get available actions for the current context
  const getAvailableActions = useCallback(() => {
    if (!combatState?.entities) return [];

    const actions = [
      {
        id: "basic_attack",
        name: "Attack",
        type: "attack",
        cooldown: getCooldownPercentage("basic_attack"),
        canUse: canUseAction("basic_attack"),
        key: "1",
      },
      {
        id: "defend",
        name: "Defend",
        type: "ability",
        cooldown: getCooldownPercentage("defend"),
        canUse: canUseAction("defend"),
        key: "2",
      },
      {
        id: "special",
        name: "Special",
        type: "ability",
        cooldown: getCooldownPercentage("special"),
        canUse: canUseAction("special"),
        key: "3",
      },
    ];

    return actions;
  }, [combatState?.entities, getCooldownPercentage, canUseAction]);

  return {
    // State
    selectedTarget,
    selectedEntity,
    activeActionMode,

    // Actions
    setSelectedTarget,
    setActiveActionMode,
    handleHotbarAction,
    handleTargetSelection,
    clearTarget,
    executeAttack,
    executeAbility,

    // Utilities
    getCooldownPercentage,
    canUseAction,
    getAvailableActions,
  };
}
