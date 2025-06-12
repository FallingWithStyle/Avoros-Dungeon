# TODO List

## 🚨 High Priority / Critical Items

### Logging & Debugging
- [ ] **Re-enable verbose logging** when needed for debugging
  - Combat system logs (currently reduced in `combat-system.ts`)
  - Map debug logs (currently reduced in `map.tsx`)
  - Room navigation logs (currently reduced in `room-navigation.tsx`)
  - Redis service logs (currently reduced in `redis-service.ts`)

### Performance & Infrastructure
- [ ] **Fix Redis connection** - Redis is not connected (ECONNREFUSED 127.0.0.1:6379)
  - Redis service exists but isn't being used
  - All data operations are falling back to direct database queries
  - Need to start Redis service or configure connection properly

### Bug Fixes
- [x] ~~Map rendering issues~~ - Fixed map display for surrounding rooms
- [ ] **WebSocket connection errors** - Invalid URL construction with undefined port
- [ ] **Unhandled promise rejections** - Multiple unhandled rejections in console

## 🔧 Technical Improvements

### Code Quality
- [ ] Implement proper error handling for all API calls
- [ ] Add comprehensive TypeScript types for all data structures
- [ ] Add unit tests for critical game logic
- [ ] Implement proper caching strategy with Redis

### Performance Optimizations
- [ ] Implement Redis caching for:
  - Crawler data (`getCrawler`, `setCrawler`, `invalidateCrawler`)
  - Room/exploration data (`getExploredRooms`, `getCurrentRoom`)
  - Leaderboard data (`getLeaderboard`, `setLeaderboard`)
  - User data (`getUserCrawlers`, `setUserCrawlers`)
- [ ] Reduce API polling frequency for less critical data
- [ ] Implement WebSocket for real-time updates instead of polling

### Database
- [ ] Optimize database queries with proper indexing
- [ ] Implement database connection pooling
- [ ] Add database migration rollback capabilities

## 🎮 Game Features

### Core Gameplay
- [ ] **Combat System Enhancements**
  - Implement different weapon types with unique mechanics
  - Add status effects (poison, burn, stun, etc.)
  - Create boss encounters with special mechanics
  - Fix combat stats and make them meaningful
- [ ] **Add more Crawler Generation variety**
  - More names
  - Level 1 class = pre-dungeon career 

### User Experience
- [ ] **Map & Navigation**
  - Add minimap overlay
  - Implement fog of war for unexplored areas
  - Add room bookmarking/waypoints
  - Show other players' locations on map
- [ ] **Login Screen**
  - Update with current classes, system info, theming 

### Social Features
- [ ] **Corporation/Guild System**
  - Allow players to form corporations
  - Implement corporation-wide benefits
  - Add corporation leaderboards
  - Enable resource sharing between corporation members
  - Enable corporation representative names

### Equipment & Progression
- [ ] **Advanced Equipment System**
  - Implement equipment crafting
  - Add equipment modding/upgrading
  - Create rare/legendary equipment tiers
  - Add equipment sets with bonuses

### Economy
- [ ] **Enhanced Marketplace**
  - Add auction system
  - Implement player-to-player trading
  - Create dynamic pricing based on supply/demand
  - Add marketplace history tracking

## 🔮 Future Ideas

### Advanced Features
- [ ] **Seasonal Events**
  - Special dungeon floors during events
  - Limited-time equipment and rewards
  - Seasonal leaderboards with unique prizes

- [ ] **PvP System**
  - Allow fights between crawlers
  - Corporation vs corporation battles
  - Ranking system for competitive play

- [ ] **Mobile Support**
  - Responsive design for mobile devices
  - Touch-friendly controls
  - Mobile-specific UI optimizations

### Content Expansion
- [ ] **Multiple Dungeon Types**
  - Different themes (sci-fi, fantasy, horror)
  - Unique mechanics per dungeon type
  - Cross-dungeon progression system

- [ ] **Unique Social Clubs**
  - Exclusive clubs/guilds/temples
  - Access varies by crawler accomplishments, class, skills, quests, affiliations
  - Joining one might bar you from others

- [ ] **NPC System**
  - Friendly NPCs with quests
  - Merchants with unique inventories
  - Story NPCs that advance plot

## 📝 Documentation

- [ ] Create API documentation
- [ ] Write deployment guide
- [ ] Document game mechanics for players
- [ ] Create troubleshooting guide
- [ ] Write contribution guidelines

## 🔍 Monitoring & Analytics

- [ ] Implement error tracking (e.g., Sentry)
- [ ] Add performance monitoring
- [ ] Create admin dashboard for game statistics
- [ ] Implement player behavior analytics

---

## Bug Fixes Needed

- [x] **Unified Gesture Library** - Consolidated keyboard and touch movement to use @use-gesture/react
- [x] **Mobile Touch Movement** - Unified gesture system implemented using @use-gesture/react

## Next Priority Features

- [ ] **Combat System Expansion**
  - [ ] Add special abilities and spells
  - [ ] Implement status effects (poison, stun, etc.)
  - [ ] Add weapon types and damage modifiers

---

## How to Use This File

1. **Check off completed items** with `[x]`
2. **Add new items** under appropriate sections
3. **Use priority indicators**: 🚨 Critical, 🔧 Technical, 🎮 Features, 🔮 Future
4. **Reference specific files** when tasks relate to particular code
5. **Update regularly** as development progresses

---

*Last updated: June 10 2025*