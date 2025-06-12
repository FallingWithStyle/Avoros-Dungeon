# Changelog

## [Unreleased]

### Added

## [0.8.9] - 2025-01-26

### Changed
- Completely unified input system to use @use-gesture/react for both keyboard and touch input
- Cleaned up remaining references to deprecated swipe movement system

### Removed
- Removed useSwipeMovement.ts hook completely in favor of unified gesture system

## [0.8.8] - 2025-01-26

### Changed
- Updated keyboard movement to use @use-gesture/react library for consistency with touch input
- Removed redundant useSwipeMovement hook in favor of unified gesture handling

### Removed
- Deprecated useSwipeMovement.ts hook

## [0.8.7] - 2025-01-26

### Added
- Implemented react-use-gesture library for improved mobile touch movement
- New gesture-based movement hook with better touch recognition and responsiveness

### Fixed
- Mobile touch movement now works properly in tactical view
- Improved gesture recognition with proper dead zones and intensity scaling
- Complete equipment system overhaul with weapons, armor, and shields
- Weapon system with damage attributes (Might/Agility/Intellect), range, and special abilities
- Armor system with defense values, body part protection, and set bonuses
- Shield system with active blocking mechanics and damage reduction
- Equipment stats calculations and utilities
- Scavenger and Security armor sets with completion bonuses
- Range-based weapon types from melee to sniper rifles

### Changed
- Updated database schema to support new equipment mechanics
- Redesigned equipment display in crawler status panel
- Enhanced equipment seeding with realistic weapon and armor progression

## [0.8.6] - 2025-06-11

### Fixed
- Fixed import/export issues with TacticalViewPanel and TacticalHotbar components
- Resolved module loading errors in tactical view components
- Corrected Redis status indicator import syntax

## [0.8.5] - 2025-01-26

### Changed
- Renamed dungeon from "Avavor" to "Avoros" throughout the application

## [0.8.4] - 2025-01-26
### Added
- 360-degree movement system supporting all directions, not just cardinal
- Continuous movement input handling with reduced cooldowns
- Virtual thumbstick behavior for mobile touch controls  
- Multi-key combination support for keyboard (diagonal movement)
- Normalized diagonal movement to prevent speed advantages

### Changed
- Movement execution time reduced from 50ms to 10ms for smoother gameplay
- Keyboard movement now supports WASD combinations for diagonal movement
- Mobile swipe converted to thumbstick-style continuous directional input
- Movement speed reduced to 3 for smoother continuous movement

## [0.8.3] - 2025-06-10

### Fixed
- Disabled tactical grid click functionality to prevent errors
- Fixed scan range NaN error
- Fixed SQL syntax errors in getScannedRooms method
- Fixed crawler positioning logic and minimap updates
- Fixed TypeScript import syntax errors

## [0.8.2] - 2025-06-10

### Fixed
- Fixed React hooks order violations in tactical view
- Fixed WebSocket URLs and recreated tactical panel components
- Fixed template literal syntax errors throughout codebase
- Added crash protection for swipe movements

## [0.8.1] - 2025-06-10

### Added
- Swipe-to-move functionality for mobile tactical view
- Mobile-friendly dropdown menu header
- Collapsible sections for mobile crawler view

### Fixed
- Fixed mobile layout spacing issues
- Fixed JSX syntax errors in crawler view

## [0.8.0] - 2025-06-09

### Changed
- Major movement system refactor: removed dungeon WASD, simplified tactical movement
- Fixed queue processing and reduced API polling
- Made gate crossing detection more lenient
- Improved action queue processing

### Added
- Added mob indicators to dungeon map display
- Added Redis fallback control to debug panel
- Created tactical and dungeon movement hooks

## [0.7.0] - 2025-06-09

### Changed
- Complete stat system overhaul: Replaced old stats with new RPG system (might, agility, endurance, intellect, charisma, wisdom, power, maxPower, luck)
- Updated crawler creation routes to use new stat names
- Modified all frontend components to reference new stat system

### Added
- Added Redis fallback mode controls
- Added mob spawning with detailed error logging
- Added debug spawn mob button and endpoint

## [0.6.0] - 2025-06-08

### Added
- Automatic dungeon map refresh when moving through doors
- Map data now updates immediately when crawler moves between rooms
- Better coordination between tactical view and dungeon map components

### Changed
- Unified terminology: Renamed all "enemies", "creatures", and "NPCs" to "mobs"
- Updated storage layer to use unified mob terminology
- Added migrations 0010-0012 for entity system refactoring

## [0.5.0] - 2025-06-08

### Added
- Zelda-style keyboard movement system
- WASD movement with speed-based timing
- Proximity-based exit movement to tactical view
- Debug panel with localStorage persistence

### Fixed
- Fixed map rendering issues for surrounding rooms
- Corrected modular storage system dependencies
- Improved Redis caching for tactical positions

## [0.4.0] - 2025-06-08

### Added
- Redis caching system with fallback to database
- Comprehensive error handling
- Optimized database queries with proper indexing
- Enhanced debug mob spawning with detailed error logging

### Changed
- Improved tactical view fallback handling
- Enhanced error handling for tactical data endpoint

## [0.3.0] - 2025-06-08

### Added
- Debug endpoints to manually enable/disable Redis fallback mode
- setForceFallbackMode() and isForceFallbackMode() methods to RedisService
- Enhanced debug panel with Redis control section

### Fixed
- Fixed tactical view data loading and error handling
- Fixed missing exports and TypeScript config issues

## [0.2.0] - 2025-06-08

### Added
- Persistent mob system with respawn mechanics
- Hotbar with numbered action buttons and keyboard shortcuts
- Action queue visualization panel
- Right-click movement options for empty grid space

### Changed
- Updated combat system with movement and AI enhancements
- Improved combat flow with movement and auto-start
- Enhanced entry positioning and party support

## [0.1.0] - 2025-06-07

### Added
- Core dungeon crawler gameplay
- WebSocket support for real-time updates
- Map rendering with debugging and error handling
- Jest testing framework with TypeScript support
- Comprehensive CombatSystem tests

### Fixed
- Fixed crawler deletion by removing activities first
- Fixed delete endpoint authentication and data deletion logic
- Fixed storage system circular dependency

## [0.0.10] - 2025-06-07

### Added
- Redis caching across storage classes
- Organized hardcoded text into specialized storage classes
- Comprehensive README.md with project documentation

### Fixed
- Fixed syntax errors and import paths
- Fixed crawler creation by implementing missing methods

## [0.0.9] - 2025-06-06

### Added
- Enhanced combat system with AI, range, and movement
- Room Events panel with real-time activity tracking
- Context menus and enhanced mouse interactions
- Directional entry positioning for players

### Fixed
- Fixed health bar display conditions
- Fixed duplicate function declaration errors

## [0.0.8] - 2025-06-06

### Added
- Keyboard hotkeys 1-0 for hotbar actions
- Reduced hotbar to 10 actions with cooldown indicators
- Enhanced targeting with auto-selection and movement

### Fixed
- Fixed HP display and damage handling in tactical view
- Fixed events order and empty space selection UI

## [0.0.7] - 2025-06-06

### Added
- Combat system class integration with tactical view
- Tactical view panel for room visualization
- Real room data integration for tactical view

### Fixed
- Fixed tactical view loading and made it square
- Fixed player entry positioning

## [0.0.6] - 2025-06-05

### Added
- Faction borders for scanned rooms with faint styling
- Starting coordinates to faction logging
- Room type colors preservation for scanned rooms

### Fixed
- Fixed missing imports and property access errors
- Fixed leaderboard error and getFloorBounds implementation

## [0.0.5] - 2025-06-05

### Added
- Serial column and avatar generation updates
- Migration SQL command and db:migrate script
- Crawler creation with serial field inclusion

### Fixed
- Fixed crawler creation null health constraint error
- Fixed syntax errors in storage.ts and init-db.ts

## [0.0.4] - 2025-06-05

### Added
- Orange neutral mob indicators to map
- Map preview to crawler mode
- Enemy/player indicators to map with preview

### Fixed
- Fixed scroll wheel preventDefault errors
- Fixed faction scope error and added floor bounds API

## [0.0.3] - 2025-06-05

### Added
- Faction-colored borders to map rooms
- Eyes of D'Bug debug spell with 100 scan range
- Scan ability with room type color coding on mini-map
- Environment badge to room display

### Fixed
- Fixed crawler icon on mini-map consistency
- Fixed expanded map layout to use full dialog space

## [0.0.2] - 2025-06-05

### Added
- Environment field to rooms with indoor/outdoor/underground options
- Scanning system for rooms
- FloorId to adjacent rooms in getExploredRooms

### Fixed
- Fixed map to show rooms on current floor only
- Fixed map crashes and WebSocket connection errors

## [0.0.1] - 2025-05-31

### Added
- Initial project setup
- TypeScript configuration
- Database connection setup
- Basic routing structure
- Replit Auth integration
- Database migrations system
- Core dungeon crawler gameplay foundation
- Corporate sponsor theme with generated company names
- Game seasons and crawler sponsorship system
- Dungeon exploration mechanics
- Mini-map display system
- Basic crawler creation and management
- Room navigation and movement system
- Energy system for crawler actions
- Safe room indicators and map features

### Fixed
- Crawler movement errors and data cleanup after deletion
- Error handling for dungeon exploration failures
- Crawler selection and generation improvements