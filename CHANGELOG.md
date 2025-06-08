
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

### Technical
- Updated database column references from `enemyId` to `mobTypeId`
- Updated imports and type definitions throughout codebase
- Updated storage layer to use unified mob terminology
