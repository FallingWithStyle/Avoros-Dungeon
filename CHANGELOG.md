
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.2] - 2025-01-27

### Changed
- Added comprehensive file responsibility comments across all source files

### Technical
- Documented all TypeScript files with responsibility headers
- Organized codebase documentation for better maintainability

## [0.4.1] - 2025-01-23

### Added
- Debug endpoints to manually enable/disable Redis fallback mode (`/api/debug/redis-fallback`)
- Redis fallback mode controls in debug panel for bandwidth conservation
- Fallback mode status indicators in Redis status endpoint

### Changed
- Redis service now respects forced fallback mode for all cache operations
- Updated Redis status endpoint to include fallback mode information

### Technical
- Added `setForceFallbackMode()` and `isForceFallbackMode()` methods to RedisService
- Enhanced debug panel with Redis control section for pre-production testing

## [0.4.0] - 2025-01-23

### Changed
- Complete stat system overhaul: Replaced old stats (attack, defense, speed, wit, memory) with new RPG system (might, agility, endurance, intellect, charisma, wisdom, power, maxPower, luck)
- Updated all UI components to display new stat system
- Added power bars to crawler status vitals section

### Fixed
- Crawler creation now properly uses new stat system instead of old stat names
- Removed duplicate power bar display in combat stats section
- Fixed stat display issues in crawler cards and status panels

### Technical
- Updated database schema with new stat columns
- Modified crawler creation routes to use new stat names
- Updated all frontend components to reference new stat system

## [0.3.0] - 2025-01-23

### Added
- Automatic dungeon map refresh when moving through doors
- Enhanced room transition system with map data synchronization

### Improved
- Map data now updates immediately when crawler moves between rooms
- Better coordination between tactical view and dungeon map components

## [0.2.0] - 2025-01-22

### Changed
- Unified terminology: Renamed all "enemies", "creatures", and "NPCs" to "mobs"
- Renamed `creatureTypes` table to `mobTypes` in database schema
- Renamed `scripts/seed-enemies.ts` to `scripts/seed-mobs.ts`
- Updated all database relations and types to use mob terminology
- Added timestamps to debug console output (both minimized and expanded views)

### Added
- CHANGELOG.md file to track version changes
- Timestamp display in debug console
- Disposition system for mobs (-100 to +100 scale)
- Entity system with unified mob handling
- Tactical positioning system for room entities

### Technical
- Updated database column references from `enemyId` to `mobTypeId`
- Updated imports and type definitions throughout codebase
- Updated storage layer to use unified mob terminology
- Added migrations 0010-0012 for entity system refactoring

## [0.1.2] - 2025-01-21

### Fixed
- Map rendering issues for surrounding rooms
- Storage module exports and initialization
- Tactical view data loading
- Room state synchronization between tactical view and exploration

### Added
- Improved tactical data endpoint `/api/crawlers/:id/tactical-data`
- Enhanced room entity positioning
- Better error handling for storage operations

### Technical
- Fixed missing exports in `server/storage/index.ts`
- Corrected modular storage system dependencies
- Improved Redis caching for tactical positions

## [0.1.1] - 2025-01-20

### Added
- Redis caching system with fallback to database
- Performance optimizations for crawler data
- WebSocket foundation for real-time updates
- Enhanced debug panel with detailed system information

### Fixed
- Database connection pooling issues
- Memory leaks in polling systems
- Combat system calculation errors

### Technical
- Implemented Redis service for caching
- Added comprehensive error handling
- Optimized database queries with proper indexing

## [0.1.0] - 2025-01-18

### Added
- Core dungeon crawler gameplay
- Multi-floor dungeon system with procedural generation
- Corporation/sponsorship system
- Season-based progression
- Combat system with equipment and stats
- Map exploration with fog of war
- Tactical room view
- Real-time leaderboards
- Mobile-responsive UI

### Features
- Player crawler creation and management
- Primary and secondary sponsorship mechanics
- Faction-controlled territories
- Equipment and inventory systems
- Room-by-room exploration
- Turn-based combat encounters
- Experience and leveling progression

### Technical
- React + TypeScript frontend
- Express.js backend with TypeScript
- PostgreSQL database with Drizzle ORM
- TanStack Query for state management
- Tailwind CSS for styling
- Replit Auth integration
- Database migrations system

## [0.0.1] - 2025-01-15

### Added
- Initial project setup
- Basic authentication system
- Database schema design
- Core infrastructure
- Development environment configuration

### Technical
- Project structure establishment
- Build system configuration
- TypeScript configuration
- Database connection setup
- Basic routing structure
