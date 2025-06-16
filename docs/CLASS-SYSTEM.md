
/**
 * File: CLASS-SYSTEM.md
 * Responsibility: Define the complete class system with 50+ base classes and dynamic subclass unlocking
 */

# Class System Documentation

## Overview

The Avoros Dungeon class system features **50+ base classes** with **dynamic subclass evolution** based on playstyle. As crawlers use their abilities in specific ways, they unlock unique subclass variants that combine their base class with unexpected mechanics.

## Core Mechanics

### Base Classes (50+)
Every crawler starts by selecting one of 50+ base classes, each with unique abilities, stat priorities, and equipment preferences.

### Dynamic Subclassing
- **Playstyle Tracking**: The system monitors how players use their abilities
- **Evolution Triggers**: Specific play patterns unlock subclass variants
- **Prefix System**: Subclasses use descriptive prefixes (Dance, Shadow, Berserker, etc.)
- **Power Scaling**: Subclasses are not just cosmetic - they provide real mechanical benefits

### Subclass Unlocking
Each base class has **5 subclass variants** unlocked through:
- **Stat Focus**: Heavy investment in unexpected stats
- **Ability Usage**: Repeated use of specific ability combinations  
- **Equipment Synergy**: Wearing unusual equipment combinations
- **Combat Behavior**: Tactical preferences and positioning
- **Environmental Interaction**: How they interact with dungeon hazards

## Base Classes

### Combat Classes

#### **Warrior**
- **Primary Stats**: Might, Endurance
- **Abilities**: Charge, Shield Bash, Battle Cry
- **Equipment**: Heavy armor, melee weapons
- **Subclasses**: Dance Warrior, Frost Warrior, Shadow Warrior, Berserker Warrior, Zen Warrior

#### **Berserker**
- **Primary Stats**: Might, Agility
- **Abilities**: Rage, Reckless Swing, Blood Frenzy
- **Equipment**: Two-handed weapons, light armor
- **Subclasses**: Ice Berserker, Scholarly Berserker, Pacifist Berserker, Elegant Berserker, Quiet Berserker

#### **Paladin**
- **Primary Stats**: Might, Wisdom, Charisma
- **Abilities**: Holy Strike, Divine Shield, Heal
- **Equipment**: Blessed weapons, holy symbols
- **Subclasses**: Dark Paladin, Swift Paladin, Merchant Paladin, Wild Paladin, Silent Paladin

#### **Knight**
- **Primary Stats**: Might, Endurance, Charisma
- **Abilities**: Lance Charge, Shield Wall, Inspire
- **Equipment**: Full plate, shields, lances
- **Subclasses**: Shadow Knight, Arcane Knight, Feral Knight, Merchant Knight, Whisper Knight

#### **Monk**
- **Primary Stats**: Agility, Wisdom, Endurance
- **Abilities**: Flurry, Inner Peace, Pressure Point
- **Equipment**: Martial arts weapons, robes
- **Subclasses**: Iron Monk, Chaos Monk, Merchant Monk, Frost Monk, Loud Monk

### Agility Classes

#### **Rogue**
- **Primary Stats**: Agility, Intellect
- **Abilities**: Stealth, Backstab, Lock Pick
- **Equipment**: Daggers, leather armor, tools
- **Subclasses**: Hulking Rogue, Holy Rogue, Elemental Rogue, Social Rogue, Clumsy Rogue

#### **Assassin**
- **Primary Stats**: Agility, Intellect
- **Abilities**: Poison Blade, Vanish, Critical Strike
- **Equipment**: Poisoned weapons, dark clothing
- **Subclasses**: Healing Assassin, Loud Assassin, Holy Assassin, Clumsy Assassin, Social Assassin

#### **Ranger**
- **Primary Stats**: Agility, Wisdom
- **Abilities**: Track, Animal Companion, Multi-shot
- **Equipment**: Bows, nature gear, pets
- **Subclasses**: Urban Ranger, Necro Ranger, Fire Ranger, Social Ranger, Clumsy Ranger

#### **Scout**
- **Primary Stats**: Agility, Intellect
- **Abilities**: Eagle Eye, Trap Detection, Swift Movement
- **Equipment**: Light armor, reconnaissance tools
- **Subclasses**: Battle Scout, Arcane Scout, Social Scout, Slow Scout, Loud Scout

#### **Duelist**
- **Primary Stats**: Agility, Charisma
- **Abilities**: Riposte, Elegant Strike, Taunt
- **Equipment**: Rapiers, fancy clothing
- **Subclasses**: Clumsy Duelist, Shadow Duelist, Arcane Duelist, Brutal Duelist, Silent Duelist

### Magic Classes

#### **Wizard**
- **Primary Stats**: Intellect, Wisdom
- **Abilities**: Fireball, Magic Missile, Teleport
- **Equipment**: Robes, staffs, spell components
- **Subclasses**: Battle Wizard, Sneaky Wizard, Social Wizard, Wild Wizard, Slow Wizard

#### **Sorcerer**
- **Primary Stats**: Intellect, Charisma
- **Abilities**: Wild Magic, Metamagic, Spell Surge
- **Equipment**: Focus items, light robes
- **Subclasses**: Stable Sorcerer, Quiet Sorcerer, Tactical Sorcerer, Gentle Sorcerer, Slow Sorcerer

#### **Warlock**
- **Primary Stats**: Intellect, Charisma
- **Abilities**: Eldritch Blast, Dark Pact, Summon Familiar
- **Equipment**: Pact weapons, eldritch focuses
- **Subclasses**: Holy Warlock, Silent Warlock, Social Warlock, Gentle Warlock, Scholarly Warlock

#### **Necromancer**
- **Primary Stats**: Intellect, Wisdom
- **Abilities**: Raise Undead, Drain Life, Bone Armor
- **Equipment**: Bone implements, dark artifacts
- **Subclasses**: Dance Necromancer, Holy Necromancer, Social Necromancer, Life Necromancer, Bright Necromancer

#### **Elementalist**
- **Primary Stats**: Intellect, Agility
- **Abilities**: Element Control, Elemental Form, Storm Call
- **Equipment**: Elemental foci, environmental gear
- **Subclasses**: Stable Elementalist, Shadow Elementalist, Social Elementalist, Slow Elementalist, Gentle Elementalist

### Hybrid Classes

#### **Spellsword**
- **Primary Stats**: Might, Intellect
- **Abilities**: Weapon Enchant, Spell Strike, Mana Burn
- **Equipment**: Enchanted weapons, battle robes
- **Subclasses**: Pacifist Spellsword, Shadow Spellsword, Social Spellsword, Clumsy Spellsword, Healing Spellsword

#### **Battle Mage**
- **Primary Stats**: Might, Intellect, Endurance
- **Abilities**: Spell Armor, Combat Casting, Arcane Weapon
- **Equipment**: Medium armor, spell-enhanced weapons
- **Subclasses**: Sneaky Battle Mage, Gentle Battle Mage, Social Battle Mage, Swift Battle Mage, Chaos Battle Mage

#### **Witch Doctor**
- **Primary Stats**: Wisdom, Intellect, Charisma
- **Abilities**: Hex, Spirit Animal, Voodoo Doll
- **Equipment**: Tribal gear, spirit totems
- **Subclasses**: Tech Witch Doctor, Urban Witch Doctor, Silent Witch Doctor, Swift Witch Doctor, Gentle Witch Doctor

#### **Druid**
- **Primary Stats**: Wisdom, Endurance
- **Abilities**: Shapeshift, Nature's Wrath, Heal Nature
- **Equipment**: Natural materials, living wood
- **Subclasses**: Urban Druid, Tech Druid, Social Druid, Fire Druid, Shadow Druid

#### **Cleric**
- **Primary Stats**: Wisdom, Charisma
- **Abilities**: Divine Magic, Turn Undead, Mass Heal
- **Equipment**: Holy symbols, blessed armor
- **Subclasses**: Dark Cleric, Battle Cleric, Silent Cleric, Swift Cleric, Chaos Cleric

### Specialized Classes

#### **Artificer**
- **Primary Stats**: Intellect, Agility
- **Abilities**: Craft Item, Mechanical Familiar, Tech Magic
- **Equipment**: Tools, gadgets, mechanical devices
- **Subclasses**: Wild Artificer, Social Artificer, Battle Artificer, Natural Artificer, Simple Artificer

#### **Alchemist**
- **Primary Stats**: Intellect, Endurance
- **Abilities**: Brew Potion, Explosive Flask, Transmutation
- **Equipment**: Alchemical supplies, protective gear
- **Subclasses**: Social Alchemist, Battle Alchemist, Simple Alchemist, Wild Alchemist, Swift Alchemist

#### **Bard**
- **Primary Stats**: Charisma, Intellect
- **Abilities**: Inspire, Song Magic, Charm
- **Equipment**: Instruments, performance gear
- **Subclasses**: Silent Bard, Battle Bard, Shadow Bard, Simple Bard, Antisocial Bard

#### **Merchant**
- **Primary Stats**: Charisma, Intellect
- **Abilities**: Appraise, Negotiate, Gold Rush
- **Equipment**: Trade goods, scales, ledgers
- **Subclasses**: Battle Merchant, Shadow Merchant, Wild Merchant, Simple Merchant, Antisocial Merchant

#### **Scholar**
- **Primary Stats**: Intellect, Wisdom
- **Abilities**: Research, Ancient Knowledge, Quick Study
- **Equipment**: Books, research tools, libraries
- **Subclasses**: Battle Scholar, Wild Scholar, Social Scholar, Simple Scholar, Swift Scholar

### Exotic Classes

#### **Summoner**
- **Primary Stats**: Intellect, Charisma
- **Abilities**: Summon Creature, Bond, Merge
- **Equipment**: Summoning circles, binding items
- **Subclasses**: Solo Summoner, Battle Summoner, Silent Summoner, Swift Summoner, Simple Summoner

#### **Psion**
- **Primary Stats**: Intellect, Wisdom
- **Abilities**: Mind Blast, Telepathy, Psychic Shield
- **Equipment**: Psionic focuses, mental enhancers
- **Subclasses**: Social Psion, Battle Psion, Simple Psion, Wild Psion, Loud Psion

#### **Shapeshifter**
- **Primary Stats**: Endurance, Agility
- **Abilities**: Alter Form, Mimic, Adapt
- **Equipment**: Adaptive gear, transformation aids
- **Subclasses**: Stable Shapeshifter, Social Shapeshifter, Battle Shapeshifter, Simple Shapeshifter, Slow Shapeshifter

#### **Time Mage**
- **Primary Stats**: Intellect, Wisdom
- **Abilities**: Haste, Slow, Time Stop
- **Equipment**: Temporal artifacts, clockwork items
- **Subclasses**: Chaotic Time Mage, Social Time Mage, Battle Time Mage, Simple Time Mage, Present Time Mage

#### **Void Walker**
- **Primary Stats**: Intellect, Agility
- **Abilities**: Phase Step, Void Blast, Reality Tear
- **Equipment**: Void-touched items, dimensional gear
- **Subclasses**: Stable Void Walker, Social Void Walker, Bright Void Walker, Simple Void Walker, Slow Void Walker

### Support Classes

#### **Healer**
- **Primary Stats**: Wisdom, Charisma
- **Abilities**: Greater Heal, Cure Disease, Resurrection
- **Equipment**: Medical supplies, holy symbols
- **Subclasses**: Battle Healer, Harm Healer, Shadow Healer, Swift Healer, Antisocial Healer

#### **Buffer**
- **Primary Stats**: Charisma, Wisdom
- **Abilities**: Enhance Abilities, Group Buff, Aura
- **Equipment**: Enhancement focuses, team gear
- **Subclasses**: Debuff Buffer, Solo Buffer, Battle Buffer, Silent Buffer, Simple Buffer

#### **Controller**
- **Primary Stats**: Intellect, Wisdom
- **Abilities**: Crowd Control, Battlefield Control, Lockdown
- **Equipment**: Control implements, battlefield tools
- **Subclasses**: Chaos Controller, Social Controller, Simple Controller, Wild Controller, Swift Controller

#### **Guardian**
- **Primary Stats**: Endurance, Charisma
- **Abilities**: Protect Others, Damage Redirect, Shield Ally
- **Equipment**: Protective gear, defensive tools
- **Subclasses**: Selfish Guardian, Shadow Guardian, Swift Guardian, Antisocial Guardian, Offensive Guardian

### Unique Classes

#### **Gambler**
- **Primary Stats**: Charisma, Agility
- **Abilities**: Lucky Strike, Risk/Reward, Probability Manipulation
- **Equipment**: Gaming implements, luck charms
- **Subclasses**: Cautious Gambler, Battle Gambler, Unlucky Gambler, Silent Gambler, Predictable Gambler

#### **Mimic**
- **Primary Stats**: Agility, Intellect
- **Abilities**: Copy Ability, Steal Skill, Adaptation
- **Equipment**: Adaptive equipment, copying tools
- **Subclasses**: Original Mimic, Battle Mimic, Social Mimic, Simple Mimic, Stable Mimic

#### **Plague Doctor**
- **Primary Stats**: Intellect, Wisdom
- **Abilities**: Disease Control, Pandemic, Quarantine
- **Equipment**: Medical masks, disease samples
- **Subclasses**: Healthy Plague Doctor, Social Plague Doctor, Battle Plague Doctor, Swift Plague Doctor, Simple Plague Doctor

#### **Beast Master**
- **Primary Stats**: Charisma, Wisdom
- **Abilities**: Animal Bond, Pack Leader, Wild Empathy
- **Equipment**: Animal gear, beast communication tools
- **Subclasses**: Solo Beast Master, Urban Beast Master, Tech Beast Master, Gentle Beast Master, Simple Beast Master

#### **Architect**
- **Primary Stats**: Intellect, Endurance
- **Abilities**: Build Structure, Trap Creation, Environmental Shaping
- **Equipment**: Building tools, architectural plans
- **Subclasses**: Destruction Architect, Social Architect, Battle Architect, Simple Architect, Natural Architect

#### **Chef**
- **Primary Stats**: Charisma, Intellect
- **Abilities**: Cooking Buffs, Food Weapons, Taste Test
- **Equipment**: Cooking implements, exotic ingredients
- **Subclasses**: Poison Chef, Battle Chef, Burnt Chef, Silent Chef, Simple Chef

#### **Librarian**
- **Primary Stats**: Intellect, Wisdom
- **Abilities**: Knowledge Search, Information Overload, Silence
- **Equipment**: Books, cataloging systems, reading glasses
- **Subclasses**: Battle Librarian, Loud Librarian, Social Librarian, Illiterate Librarian, Simple Librarian

#### **Janitor**
- **Primary Stats**: Endurance, Wisdom
- **Abilities**: Clean Up, Maintenance, Spot Hidden
- **Equipment**: Cleaning supplies, maintenance tools
- **Subclasses**: Messy Janitor, Battle Janitor, Social Janitor, Chaotic Janitor, Lazy Janitor

#### **Insurance Adjuster**
- **Primary Stats**: Intellect, Charisma
- **Abilities**: Risk Assessment, Damage Calculation, Claim Denial
- **Equipment**: Clipboards, assessment tools, legal documents
- **Subclasses**: Generous Insurance Adjuster, Battle Insurance Adjuster, Social Insurance Adjuster, Reckless Insurance Adjuster, Simple Insurance Adjuster

#### **Tax Collector**
- **Primary Stats**: Charisma, Intellect
- **Abilities**: Audit, Penalty Assessment, Wealth Redistribution
- **Equipment**: Ledgers, official seals, collection bags
- **Subclasses**: Generous Tax Collector, Battle Tax Collector, Antisocial Tax Collector, Simple Tax Collector, Corrupt Tax Collector

## Subclass Evolution Examples

### Dance Necromancer (Necromancer + Agility Focus)
**Unlock Condition**: Use necromancy abilities while maintaining high agility and movement
**New Abilities**:
- **Bone Ballet**: Undead minions perform coordinated dance attacks
- **Rhythmic Resurrection**: Raise dead to the beat, increasing their speed
- **Death Waltz**: AoE spell that damages enemies in dance patterns

### Shadow Warrior (Warrior + Stealth Behavior)
**Unlock Condition**: Frequently use stealth and positioning despite being a warrior
**New Abilities**:
- **Silent Charge**: Charge attack that doesn't break stealth
- **Shadow Armor**: Heavy armor that provides stealth bonuses
- **Whisper Strike**: Melee attacks that apply silence effects

### Social Rogue (Rogue + High Charisma Usage)
**Unlock Condition**: Frequently use social abilities and party coordination
**New Abilities**:
- **Cooperative Stealth**: Can stealth entire party
- **Charming Backstab**: Backstab attempts that can convert enemies
- **Network**: Information gathering through social connections

### Holy Warlock (Warlock + Divine Equipment/Abilities)
**Unlock Condition**: Use warlock powers while wielding holy items
**New Abilities**:
- **Divine Pact**: Pacts with celestial beings instead of demons
- **Blessed Eldritch**: Holy damage eldritch blasts
- **Sacred Familiar**: Summon angelic helpers

### Battle Scholar (Scholar + Combat Focus)
**Unlock Condition**: Frequently engage in direct combat while researching
**New Abilities**:
- **Combat Research**: Learn enemy weaknesses mid-fight
- **Tactical Tome**: Books that provide battlefield advantages
- **Knowledge Strike**: Attacks that exploit learned weaknesses

## Subclass Unlock Tracking

### Stat-Based Unlocks
- **Unusual Stat Investment**: 30% of points in non-primary stats
- **Extreme Specialization**: 70% of points in single stat
- **Balanced Approach**: Even distribution across all stats

### Behavior-Based Unlocks
- **Combat Patterns**: Track aggressive vs defensive vs supportive behavior
- **Social Interaction**: Monitor charisma-based ability usage
- **Environmental Interaction**: How often they manipulate the environment

### Equipment-Based Unlocks
- **Cross-Class Equipment**: Wearing gear typically used by other classes
- **Specialized Builds**: Focusing on specific equipment types
- **Hybrid Approaches**: Combining unexpected equipment categories

### Ability Usage Unlocks
- **Combo Frequency**: Using specific ability combinations repeatedly
- **Creative Usage**: Using abilities in unexpected ways
- **Specialization**: Heavily favoring certain abilities over others

## Mechanical Benefits

### Enhanced Base Abilities
Subclasses don't just add new abilities - they enhance existing ones:
- **Improved Scaling**: Better stat scaling for signature abilities
- **Additional Effects**: Base abilities gain extra effects
- **Resource Efficiency**: Reduced costs or improved resource management

### Unique Equipment Access
- **Subclass-Specific Gear**: Equipment only usable by specific subclasses
- **Enhanced Crafting**: Ability to create specialized items
- **Legendary Interactions**: Special interactions with rare equipment

### Social Recognition
- **Reputation Systems**: Different reactions from NPCs
- **Guild Access**: Certain organizations only accept specific subclasses
- **Story Branches**: Unique quest lines and dialogue options

## Implementation Strategy

### Phase 1: Base Classes (50 classes)
- Implement core class mechanics
- Create base abilities and stat preferences
- Establish equipment compatibility

### Phase 2: Tracking Systems
- Build playstyle monitoring
- Create unlock condition detection
- Implement progress tracking UI

### Phase 3: Subclass Evolution
- Add subclass transformation mechanics
- Implement enhanced abilities
- Create subclass-specific content

### Phase 4: Balance and Content
- Fine-tune unlock conditions
- Add subclass-specific equipment
- Create advanced interactions

This system ensures that every playthrough can feel unique, with players discovering new subclass combinations based on how they naturally play their character. The "ridiculous number" goal is easily achieved with 50 base classes × 5 subclasses each = 250+ total class variants!
