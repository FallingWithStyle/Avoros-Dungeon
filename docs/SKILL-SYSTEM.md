
/**
 * File: SKILL-SYSTEM.md
 * Responsibility: Define the three-tier ability system (Skills, Powers, Spells) for the combat system
 */

# Skill System Documentation

## Overview

The Avoros Dungeon ability system is divided into three distinct categories, each with unique mechanics, resource requirements, and thematic purposes:

- **Skills** - Physical and learned abilities using tools and training
- **Powers** - Supernatural abilities using innate talents and gifts  
- **Spells** - Magical abilities consuming mana and magical energy

## System Architecture

### Resource Management
- **Skills**: Use energy and stamina, modified by equipment and training
- **Powers**: Consume power points, limited by innate capacity and willpower
- **Spells**: Require mana, scaled by intellect and magical equipment

### Acquisition Methods
- **Skills**: Learned through practice, training, and equipment mastery
- **Powers**: Unlocked through class progression, bloodlines, and personal awakening
- **Spells**: Studied from grimoires, taught by mentors, or discovered through experimentation

## Skills System

### Core Concept
Skills represent the crawler's mastery of physical techniques, tool usage, and learned abilities. They improve through practice and are enhanced by appropriate equipment.

### Skill Categories

#### **Combat Skills**
Physical combat techniques and weapon mastery:
- **Sword Skill** - Proficiency with blade weapons, unlock special sword techniques
- **Whip Skill** - Mastery of flexible weapons, disarming and entangling attacks
- **Shield Skill** - Defensive techniques, blocking and shield bash abilities
- **Archery Skill** - Bow and crossbow accuracy, special arrow techniques
- **Dual Wielding** - Fighting with two weapons simultaneously
- **Unarmed Combat** - Hand-to-hand fighting, martial arts techniques

#### **Utility Skills**
Practical abilities for dungeon exploration:
- **Lock Picking** - Open locked doors, chests, and mechanisms
- **Trap Detection** - Spot and disarm dangerous dungeon hazards
- **Climbing** - Scale walls and navigate vertical environments
- **Swimming** - Move efficiently through water hazards
- **Rope Use** - Advanced rope techniques for exploration and combat

#### **Social Skills**
Interpersonal abilities for NPC interaction:
- **Charm** - Influence NPCs through charisma and persuasion
- **Intimidation** - Coerce information or compliance through fear
- **Negotiation** - Secure better prices and deals with merchants
- **Deception** - Lie convincingly and misdirect opponents
- **Leadership** - Rally allies and boost party morale

#### **Stealth Skills**
Abilities for avoiding detection and surprise attacks:
- **Sneak** - Move silently and avoid enemy detection
- **Hide** - Conceal yourself in shadows and cover
- **Camouflage** - Blend into environmental surroundings
- **Pickpocket** - Steal items without being noticed
- **Silent Kill** - Eliminate enemies without alerting others

#### **Crafting Skills**
Creation and maintenance abilities:
- **Blacksmithing** - Forge and repair metal weapons and armor
- **Alchemy** - Brew potions and create chemical compounds
- **Enchanting** - Imbue items with magical properties
- **Cooking** - Prepare food that provides temporary bonuses
- **Fletching** - Craft arrows and ammunition

#### **Professional Skills**
Specialized knowledge from pre-dungeon careers:
- **Accounting** - Manage finances and detect monetary irregularities
- **Car Maintenance** - Repair and operate mechanical devices
- **Medicine** - Treat wounds and diagnose ailments
- **Engineering** - Understand and manipulate complex mechanisms
- **Law** - Navigate legal situations and contracts

### Skill Mechanics
- **Skill Points**: Earned through use and training, allocated to improve proficiency
- **Skill Ranks**: 1-10 scale, higher ranks unlock advanced techniques
- **Equipment Synergy**: Appropriate tools enhance skill effectiveness
- **Combo Skills**: Certain skill combinations unlock special techniques

## Powers System

### Core Concept
Powers are supernatural abilities that tap into the crawler's innate potential. They represent extraordinary capabilities that border on the magical but stem from personal gifts rather than learned magic.

### Power Categories

#### **Combat Powers**
Supernatural combat enhancements:
- **Berserk State** - Enter a rage that increases damage but reduces defense
- **Battle Trance** - Heightened awareness that slows time perception
- **Weapon Bond** - Supernatural connection to a specific weapon
- **Combat Instinct** - Predict enemy attacks before they happen
- **Adrenaline Surge** - Temporary boost to all physical capabilities

#### **Perception Powers**
Enhanced sensory and detection abilities:
- **Danger Sense** - Intuitive awareness of threats and traps
- **Aura Reading** - See the emotional and spiritual state of others
- **True Sight** - Pierce through illusions and concealment
- **Psychometry** - Learn the history of objects through touch
- **Life Detection** - Sense living creatures through walls

#### **Connection Powers**
Abilities that create bonds with others:
- **Find Animal Companion** - Locate and bond with a loyal creature ally
- **Empathic Link** - Share emotions and sensations with bonded allies
- **Beast Speech** - Communicate with animals and monsters
- **Spirit Guide** - Contact ancestral or spiritual advisors
- **Pack Leader** - Command respect and loyalty from group creatures

#### **Manipulation Powers**
Abilities that affect the physical world through will:
- **Telekinesis** - Move objects with mental force
- **Phase Step** - Briefly become incorporeal to pass through objects
- **Luck Manipulation** - Subtly influence probability and chance
- **Time Dilation** - Briefly accelerate or slow personal time flow
- **Gravity Control** - Alter gravitational effects in small areas

### Power Mechanics
- **Power Points**: Limited resource pool, regenerates through rest and meditation
- **Awakening**: Powers unlock through character development and story events
- **Strain**: Overuse of powers causes fatigue and temporary inability
- **Resonance**: Some powers work better with specific classes or bloodlines

## Spells System

### Core Concept
Spells are learned magical abilities that manipulate mystical energies to create supernatural effects. They require mana to cast and are improved through study and magical equipment.

### Spell Schools

#### **Elemental Magic**
Manipulation of natural forces:
- **Fireball** - Launch explosive projectiles of flame
- **Acid Rain** - Create corrosive precipitation over an area
- **Lightning Bolt** - Strike enemies with electrical energy
- **Ice Shard** - Form and hurl frozen projectiles
- **Stone Skin** - Temporarily harden flesh to resist damage

#### **Force Magic**
Direct manipulation of energy and matter:
- **Mana Missile** - Guided projectiles of pure magical energy
- **Force Shield** - Create barriers of solidified magical force
- **Teleport** - Instantly transport to a different location
- **Levitate** - Defy gravity to float and fly
- **Shatter** - Destroy objects with focused vibrational energy

#### **Illusion Magic**
Spells that deceive senses and minds:
- **Invisibility** - Become unseen by bending light around yourself
- **Mirror Image** - Create false duplicates to confuse enemies
- **Phantom Sound** - Generate sounds from distant locations
- **Disguise** - Alter appearance to look like someone else
- **Mental Fog** - Cloud enemy thoughts and decision-making

#### **Utility Magic**
Practical magical effects for exploration:
- **Light** - Create illumination in dark areas
- **Mage Hand** - Manipulate objects at a distance
- **Detect Magic** - Sense magical auras and enchantments
- **Unlock** - Magically open locked mechanisms
- **Repair** - Mend broken objects with magical energy

#### **Debuff Magic**
Spells that hinder and weaken enemies:
- **Cloud of Stank** - Create nauseating gas that impairs enemies
- **Slow** - Reduce enemy movement and reaction speed
- **Weakness** - Temporarily reduce target's physical strength
- **Blind** - Remove enemy's ability to see
- **Silence** - Prevent spellcasting and vocal abilities

#### **Enhancement Magic**
Spells that improve abilities and provide benefits:
- **Strength** - Temporarily increase physical power
- **Speed** - Enhance movement and reaction time
- **Shield** - Provide magical protection against attacks
- **Regeneration** - Accelerate natural healing processes
- **Magic Weapon** - Temporarily enchant weapons with magical properties

### Spell Mechanics
- **Mana Cost**: Each spell consumes mana based on power and complexity
- **Casting Time**: Some spells are instant, others require preparation
- **Spell Components**: Certain spells require materials or gestures
- **Spell Levels**: 1-9 scale, higher levels unlock more powerful effects
- **Spell Schools**: Specialization in schools provides bonuses and unlocks advanced spells

## Integration with Class System

### Class-Specific Tendencies
Different classes have natural affinities for different ability types:

#### **Physical Classes** (Warrior, Rogue, Ranger)
- **Primary**: Skills (70% of abilities)
- **Secondary**: Powers (25% of abilities)  
- **Tertiary**: Spells (5% of abilities)

#### **Hybrid Classes** (Paladin, Spellsword, Battle Mage)
- **Balanced**: Skills (40%), Powers (30%), Spells (30%)

#### **Magical Classes** (Wizard, Sorcerer, Necromancer)
- **Primary**: Spells (70% of abilities)
- **Secondary**: Powers (20% of abilities)
- **Tertiary**: Skills (10% of abilities)

#### **Unique Classes** (Varies by class theme)
- **Monk**: Powers (50%), Skills (40%), Spells (10%)
- **Bard**: Skills (50%), Spells (30%), Powers (20%)
- **Psion**: Powers (80%), Spells (15%), Skills (5%)

### Subclass Evolution
Subclasses can shift these ratios based on playstyle:
- **Battle Scholar**: Increases Skills percentage for combat-focused academics
- **Holy Warlock**: Increases Powers percentage for divine-touched warlocks
- **Shadow Warrior**: Increases Powers percentage for stealth-focused warriors

## Resource Management

### Energy (For Skills)
- **Base Pool**: 100 points, modified by endurance and equipment
- **Regeneration**: 5 points per second out of combat, 1 point per second in combat
- **Usage**: Skills consume 5-25 energy based on complexity and skill rank

### Power Points (For Powers)
- **Base Pool**: 50 points, modified by wisdom and character level
- **Regeneration**: 1 point per minute through meditation, full restoration after long rest
- **Usage**: Powers consume 10-40 power points based on effect strength

### Mana (For Spells)
- **Base Pool**: 25 points, modified by intellect and magical equipment
- **Regeneration**: 2 points per minute through concentration, boosted by magical items
- **Usage**: Spells consume 5-50 mana based on spell level and complexity

## Progression and Learning

### Skill Development
- **Practice**: Using skills in appropriate situations increases proficiency
- **Training**: NPCs and equipment can provide skill training opportunities
- **Equipment**: Better tools and weapons enhance skill effectiveness
- **Specialization**: Focus on related skills provides synergy bonuses

### Power Awakening
- **Story Events**: Major character moments can unlock new powers
- **Class Progression**: Advancing in levels provides access to class-specific powers
- **Bloodline**: Some powers are hereditary and unlock based on ancestry
- **Meditation**: Dedicated practice can awaken latent supernatural abilities

### Spell Learning
- **Grimoires**: Find spellbooks that teach new magical abilities
- **NPCs**: Magical teachers can provide spell instruction
- **Experimentation**: Intelligent characters can research and develop new spells
- **Equipment**: Magical items may grant temporary or permanent spell access

## Implementation Strategy

### Phase 1: Core Framework
- Implement three separate ability systems with distinct resource pools
- Create basic progression mechanics for each type
- Establish equipment integration for skills and spells

### Phase 2: Class Integration
- Add class-specific ability distributions
- Implement subclass modifications to ability access
- Create synergy systems between different ability types

### Phase 3: Advanced Systems
- Add ability combinations and combo effects
- Implement advanced progression like spell research and power awakening
- Create dynamic ability unlocking based on player actions

### Phase 4: Content Expansion
- Add hundreds of abilities across all three categories
- Create quest lines for learning rare abilities
- Implement legendary abilities that require special conditions

This three-tier system provides clear thematic distinctions while offering rich progression paths for all character types, ensuring that every class has access to interesting abilities while maintaining their unique identity.
