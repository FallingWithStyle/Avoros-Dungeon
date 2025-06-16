
# Combat System Philosophy

## Overview

The new combat system is designed around the vision of **Legend of Zelda: Link's Awakening meets Dungeon Crawler Carl meets Borderlands**. This means:

- **Real-time action** - Click to attack, move freely, no turns or queues
- **Immediate responsiveness** - Actions happen instantly when triggered
- **Over-powered feel** - Players should feel strong and capable
- **Massive variety** - Ridiculous numbers of classes, skills, spells, and equipment
- **Environmental interaction** - Hazards, cover, and tactical positioning matter
- **Loot-heavy progression** - Constant upgrades and new gear

## Core Design Principles

### 1. Immediate Action Execution
- **No action queues** - Actions execute immediately when triggered
- **Cooldown-based limiting** - Use cooldowns instead of complex timing systems
- **Responsive feedback** - Instant visual and audio feedback for all actions
- **Real-time feel** - Actions, and their effects, feel immediate when triggered

### 2. Simplified State Management
- **Single source of truth** - One combat state object
- **Direct updates** - No complex state machines
- **Clean separation** - Combat logic separate from UI concerns
- **Minimal complexity** - Easy to understand and extend

### 3. Modular Architecture
- **Pluggable systems** - Easy to add new abilities, classes, equipment
- **Hot-swappable components** - Change combat mechanics without rebuilding
- **Event-driven** - Systems communicate through events, not direct coupling
- **Extensible** - Built to handle "ridiculous numbers" of game elements

### 4. Performance First
- **Lightweight operations** - No unnecessary processing
- **Efficient updates** - Only update what changed
- **Optimized calculations** - Fast damage, hit chance, and effect calculations
- **Scalable** - Handle many entities without performance degradation

## System Components

### Combat Engine (`combat-system.ts`)
- **Entity management** - Add, remove, update combat participants
- **Action execution** - Immediate processing of attacks, spells, abilities
- **Position tracking** - Real-time positioning for tactical combat
- **State synchronization** - Keep all systems in sync

### Action System
- **Immediate execution** - No queuing, actions happen now
- **Cooldown management** - Prevent spam, enable tactical timing
- **Effect application** - Damage, healing, buffs, debuffs
- **Chain reactions** - Actions can trigger other actions

### Equipment Integration
- **Real-time stats** - Equipment changes immediately affect combat
- **Special abilities** - Weapons and armor provide unique combat options
- **Synergy bonuses** - Equipment sets enhance combat capabilities
- **Dynamic effects** - Gear can change how combat actions work

### Class & Ability System
- **Diverse classes** - Each with unique combat styles and abilities
- **Skill trees** - Deep progression with meaningful choices
- **Cross-class synergies** - Multiclassing and hybrid builds
- **Emergent gameplay** - Combinations create unexpected strategies

## Technical Architecture

### Data Flow
```
User Input → Action Validation → Immediate Execution → State Update → UI Refresh
```

### State Structure
```typescript
CombatState {
  entities: CombatEntity[]     // All participants
  isInCombat: boolean         // Combat status
  selectedEntityId?: string   // Current selection
  // No action queue - immediate execution only
}
```

### Entity Model
```typescript
CombatEntity {
  // Core identity
  id: string
  name: string
  type: "player" | "other_player" | "hostile" | "neutral" | "ally"
  
  // Health and Power Resources
  hp: number
  maxHp: number
  energy: number
  maxEnergy: number
  power: number
  maxPower: number
  
  // Primary Stats (dynamic based on equipment/effects)
  might: number        // Physical strength, melee damage
  agility: number      // Speed, evasion, ranged accuracy
  endurance: number    // Health, stamina, physical resistance
  intellect: number    // Magical damage, mana efficiency
  charisma: number     // Social interactions, leadership bonuses
  wisdom: number       // Magical resistance, perception, insight
  
  // Derived Combat Stats
  attack: number       // Calculated from might + weapon + effects
  defense: number      // Calculated from endurance + armor + effects
  speed: number        // Calculated from agility + equipment + effects
  accuracy: number     // Calculated from relevant primary stats
  evasion: number      // Calculated from agility + equipment + effects
  
  // Positioning
  position: Position
  facing?: number      // Direction in degrees (0° = North)
  
  // Character Information
  level?: number
  serial?: number      // For player identification
  
  // Action management
  cooldowns: Record<string, number>
  
  // State flags
  isSelected?: boolean
  isAlive?: boolean
  
  // Extensibility
  activeEffects?: Effect[]
  equipment?: Equipment[]
  abilities?: Ability[]
}
```

## Combat Flow (Real-time)

### 1. Room Entry
- Player enters room freely
- Enemies spawn and begin AI behavior
- Environmental hazards are active
- Combat state tracks all entities

### 2. Real-time Actions
- Player clicks to attack in direction/target
- Movement is free and immediate
- All actions respect cooldowns only
- Effects apply instantly
- Multiple entities can act simultaneously

### 3. Continuous Updates
- AI entities act independently
- Environmental effects are always active
- Status effects tick in real-time
- Victory/defeat conditions check continuously

### 4. Combat Resolution
- Combat ends when all hostiles defeated
- Loot drops immediately
- Experience/progression updates
- Room returns to peaceful state

## Extensibility Points

### New Classes
- Define base stats and abilities
- Add unique action types
- Implement class-specific mechanics
- Create progression trees

### New Equipment
- Define stat modifications
- Add special abilities or effects
- Create equipment synergies
- Implement visual/audio feedback

### New Abilities
- Define execution logic
- Set cooldowns and costs
- Add targeting rules
- Create visual effects

### New Mechanics
- Environmental interactions
- Status effect systems
- Combo systems
- Tactical positioning rules

## Performance Considerations

### Memory Management
- Pool frequently created objects
- Clean up defeated entities
- Minimize garbage collection
- Use efficient data structures

### Update Optimization
- Only process active entities
- Batch similar operations
- Use dirty flags for UI updates
- Optimize collision detection

### Scalability
- Limit concurrent actions
- Use spatial partitioning for positioning
- Implement level-of-detail for distant entities
- Cache computed values

## Integration Points

### Room System
- Combat entities spawn based on room type
- Environmental hazards from room data
- Tactical positions for entity placement
- Room effects modify combat

### Equipment System
- Real-time stat updates
- Equipment abilities in combat
- Visual representation on entities
- Durability and condition effects

### Progression System
- Experience from combat actions
- Skill point allocation
- Class advancement
- Achievement tracking

### Events System
- Combat start/end events
- Action execution events
- Damage/healing events
- Victory/defeat events

## Future Expansion

### Advanced Features
- **Combo systems** - Chain actions for bonus effects
- **Environmental destruction** - Break cover, create hazards
- **Team coordination** - Party member AI and commands
- **Dynamic difficulty** - Adapt challenge to player performance

### Content Scaling
- **Procedural abilities** - Generate new skills dynamically
- **Equipment crafting** - Create custom gear mid-combat
- **Emergent tactics** - AI learns from player strategies
- **Seasonal mechanics** - Temporary combat rule changes

## Success Metrics

### Performance Targets
- **Action response time**: < 100ms from input to visual feedback
- **Frame rate**: Maintain 60fps during heavy combat
- **Memory usage**: < 50MB for typical combat scenarios
- **Load time**: < 2s to initialize combat state

### Gameplay Goals
- **Variety**: 100+ unique abilities across all classes
- **Balance**: No single dominant strategy
- **Accessibility**: Easy to learn, hard to master
- **Fun**: Players feel powerful and engaged

This philosophy guides all combat system development decisions, ensuring we deliver the fast-paced, over-powered, loot-heavy experience that captures the essence of our inspirational games.
