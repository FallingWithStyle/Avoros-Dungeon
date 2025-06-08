
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
