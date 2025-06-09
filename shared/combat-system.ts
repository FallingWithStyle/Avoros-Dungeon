// Create and export singleton instance
export const combatSystem = new CombatSystem();

export { CombatSystem, calculateDamage, calculateHitChance };
export type { CombatEntity, CombatAction, QueuedAction, CombatState, Position };