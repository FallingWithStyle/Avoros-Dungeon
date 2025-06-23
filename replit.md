# Avoros Dungeon - Replit Coding Agent Guide

## Overview

Avoros Dungeon is a real-time multiplayer dungeon exploration game where corporations sponsor crawlers to explore dangerous dungeons and compete for resources. The application combines turn-based combat with persistent progression in a corporate-sponsored dungeon crawling setting.

## System Architecture

### Backend Architecture
- **Runtime**: Node.js with TypeScript for type safety
- **Web Framework**: Express.js for HTTP APIs and middleware
- **Database**: PostgreSQL via Neon (cloud-hosted) with Drizzle ORM for type-safe queries
- **Caching**: Redis via Upstash for session storage and game state caching (with database fallback)
- **Real-time Communication**: WebSocket server for live updates
- **Authentication**: Passport.js with OpenID Connect (Replit Auth) and Google OAuth

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **Input Handling**: @use-gesture/react for unified keyboard and touch controls

### Database Design
- **Modular Storage System**: Organized into specialized storage modules (crawler, user, exploration, tactical, etc.)
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **Connection Pooling**: Minimal connection pool (max 1) to prevent connection overload
- **Caching Strategy**: Redis-first with automatic database fallback for cost optimization

## Key Components

### Game Systems
1. **Crawler Management**: Character creation, stat generation, class system, equipment
2. **Dungeon Exploration**: Room-based navigation, floor progression, encounter system
3. **Combat System**: Turn-based tactical combat with positioning grid
4. **Equipment System**: Weapons, armor, shields with stat bonuses and special abilities
5. **Effects System**: Spell effects, status conditions, temporary bonuses
6. **Corporation System**: Player sponsors with generated corporation names

### Storage Modules
- **UserStorage**: User accounts and authentication
- **CrawlerStorage**: Crawler entities and stat management
- **ExplorationStorage**: Room navigation and dungeon layout
- **TacticalStorage**: Combat positioning and tactical data
- **MobStorage**: Enemy spawning and management
- **ContentStorage**: Game content and random generation
- **CorporationStorage**: Corporation name generation

### Frontend Features
- **Responsive Design**: Mobile-friendly with touch controls and collapsible panels
- **Real-time Updates**: WebSocket integration for live game state
- **Tactical View**: Grid-based combat interface with entity positioning
- **Mini-map**: Room exploration visualization with fog of war
- **Mobile Controls**: Gesture-based movement and touch-optimized interface

## Data Flow

### Request Processing
1. Client sends HTTP request through Express middleware
2. Authentication middleware verifies user session
3. Route handlers delegate to appropriate storage modules
4. Storage modules check Redis cache before database queries
5. Database queries use connection pooling and query optimization
6. Response data is cached in Redis and returned to client

### Real-time Updates
1. WebSocket connections established on page load
2. Game state changes trigger WebSocket broadcasts
3. Client receives updates and refreshes relevant UI components
4. TanStack Query manages cache invalidation and refetching

### Caching Strategy
- **L1 Cache**: Request-level caching to prevent duplicate queries within single request
- **L2 Cache**: Redis caching for frequently accessed data (crawler stats, room data)
- **Fallback Mode**: Automatic database fallback when Redis is unavailable
- **Cache Invalidation**: Targeted invalidation when game state changes

## External Dependencies

### Cloud Services
- **Neon**: PostgreSQL database hosting
- **Upstash**: Serverless Redis for caching
- **Replit**: Development environment and authentication

### Authentication Providers
- **Replit Auth**: Primary authentication via OpenID Connect
- **Google OAuth**: Alternative authentication method

### Package Dependencies
- **Database**: @neondatabase/serverless, drizzle-orm, drizzle-kit
- **Caching**: @upstash/redis, ioredis
- **Authentication**: passport, openid-client, passport-google-oauth20
- **Real-time**: ws (WebSocket)
- **UI Components**: @radix-ui/* components, tailwindcss
- **Utilities**: zod, nanoid, memoizee

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with PostgreSQL 16 and Valkey (Redis-compatible)
- **Hot Reloading**: Vite dev server with HMR
- **Process Management**: tsx for TypeScript execution
- **Port Configuration**: Main app on port 5000, status page on port 3001

### Production Build
- **Frontend**: Vite builds to dist/public with asset optimization
- **Backend**: esbuild bundles server code to dist/index.js
- **Deployment Target**: Autoscale with build and run commands
- **Asset Serving**: Express serves static files in production

### Environment Configuration
- **Database**: DATABASE_URL for PostgreSQL connection
- **Cache**: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
- **Authentication**: SESSION_SECRET, REPLIT_DOMAINS, ISSUER_URL
- **Features**: NODE_ENV for environment-specific behavior

## Changelog

- June 22, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.