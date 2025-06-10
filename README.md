
# Avoros Dungeon

A real-time multiplayer dungeon exploration game where corporations sponsor crawlers to explore dangerous dungeons and compete for resources and glory.

![Game Screenshot](https://via.placeholder.com/800x400?text=Avoros+Dungeon)

## 🎮 Game Overview

**Avoros Dungeon** is a turn-based exploration game where players take on the role of corporate sponsors managing individual crawlers. Each corporation gets one shot - sponsor a single crawler through deadly encounters and exploration. Death means starting over completely.

### Key Features

- **Turn-based Combat System** - Strategic combat with multiple character classes
- **Equipment Marketplace** - Trade and upgrade gear with other players
- **Real-time Command Chat** - Coordinate with other corporations
- **Persistent Progression** - Build your corporate reputation over time
- **Seasonal Competition** - Compete in time-limited seasons for exclusive rewards

### Crawler Classes

- **Combat Veteran** - High attack & defense specialization
- **Tech Specialist** - Advanced technology and hacking abilities
- **Stealth Operative** - Speed & stealth focus for reconnaissance

## 🛠 Tech Stack

### Backend
- **Node.js** with **TypeScript**
- **Express** for HTTP APIs and session management
- **WebSockets** for real-time communication

### Database
- **PostgreSQL** (hosted via [Neon](https://neon.tech/))
- **Drizzle ORM** for type-safe database access
- **connect-pg-simple** for storing sessions in Postgres

### In-Memory / Real-Time Data
- **ioredis** for fast, in-memory data storage (game state, caching, etc.)
- **Upstash** for managed, serverless Redis (cloud-hosted Redis instance)

### Frontend
- **React** with **TypeScript**
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Wouter** for client-side routing
- **TanStack Query** for server state management

### Authentication
- **Passport** for authentication middleware
- **openid-client** for OpenID Connect (Replit integration)

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or higher
- PostgreSQL database
- Redis instance
- Replit account (for authentication)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
DATABASE_URL=your_postgresql_connection_string
REDIS_URL=your_redis_connection_string
SESSION_SECRET=your_session_secret_key
NODE_ENV=development
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd avavor-dungeon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npm run db:push
   ```

4. **Seed initial game data**
   ```bash
   npm run seed:factions
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 📝 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run start` - Start the production server
- `npm run check` - Run TypeScript type checking
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ci` - Run tests for CI (no watch, with coverage)
- `npm run db:push` - Push database schema changes
- `npm run db:migrate` - Run database migrations
- `npm run seed:factions` - Seed faction data
- `npm run generate-dungeon` - Generate dungeon layouts

## 🎯 Game Mechanics

### Crawler Management
- Each corporation sponsors a single crawler
- Crawlers have unique backgrounds, stats, and competencies
- Death is permanent - lose your crawler and start over

### Exploration System
- Navigate through procedurally generated dungeon floors
- Encounter various challenges, enemies, and treasures
- Make strategic decisions that affect crawler survival

### Combat System
- Turn-based combat with multiple action types
- Stats influence success rates and damage
- Equipment affects combat effectiveness

### Progression
- Gain experience and credits through successful exploration
- Upgrade equipment and abilities
- Build corporate reputation on leaderboards

### Seasonal Competition
- Time-limited seasons with special rewards
- Corporate leaderboards reset each season
- Exclusive seasonal achievements and titles

## 🏗 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Main application pages
│   │   ├── views/          # Complex view components
│   │   ├── panels/         # Game panel components
│   │   ├── features/       # Feature-specific code
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Backend Node.js application
│   ├── routes/             # API route handlers
│   ├── storage/            # Data access layer
│   └── db.ts               # Database configuration
├── shared/                 # Shared TypeScript definitions
├── migrations/             # Database migration files
└── scripts/               # Utility scripts
```

## 🔧 Development

### Adding New Features

1. **Database Changes**
   - Update schema in `shared/schema.ts`
   - Create migration: `npm run db:migrate`

2. **API Endpoints**
   - Add routes in `server/routes/`
   - Update route registration in `server/routes/index.ts`

3. **Frontend Components**
   - Create components in appropriate `client/src/` subdirectory
   - Follow existing patterns for styling and state management

4. **Testing**
   - Write unit tests for new functionality
   - Place tests in `__tests__` directories or use `.test.ts` suffix
   - Run `npm test` to execute all tests
   - Use `npm run test:watch` during development

### Testing Strategy

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database interactions
- **Coverage**: Aim for meaningful test coverage of critical paths
- **Test Structure**: Use `describe` and `it` blocks for clear organization

### Code Style

- TypeScript for all new code
- ESLint configuration for code consistency
- Tailwind CSS for styling
- Component-first architecture
- Jest for unit testing

## 🚀 Deployment

### Production Build

```bash
npm run build
```

### Deployment on Replit

The project is configured for deployment on Replit with the following setup:

- **Build Command**: `npm run build`
- **Run Command**: `npm run start`
- **Port**: 5000 (mapped to 80/443 in production)

Environment variables should be configured in the Replit Secrets panel.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write TypeScript for all new code
- Include proper error handling
- Add appropriate logging for debugging
- Follow existing code patterns and architecture
- Test new features thoroughly

## 📚 API Documentation

### Authentication
- `POST /api/auth/replit` - Authenticate with Replit
- `POST /api/auth/logout` - Logout current user

### Crawler Management
- `GET /api/crawlers` - Get user's crawlers
- `POST /api/crawlers` - Create new crawler
- `PUT /api/crawlers/:id` - Update crawler

### Exploration
- `POST /api/exploration/move` - Move crawler in dungeon
- `GET /api/exploration/current` - Get current exploration state
- `POST /api/exploration/action` - Perform exploration action

### Combat
- `POST /api/combat/action` - Perform combat action
- `GET /api/combat/state` - Get current combat state

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running and accessible

**Redis Connection Issues**
- Check `REDIS_URL` configuration
- Verify Redis instance is running

**Authentication Problems**
- Ensure Replit OAuth is properly configured
- Check session configuration and secrets

**Build Errors**
- Clear `node_modules` and reinstall dependencies
- Check for TypeScript compilation errors

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- Inspired by classic dungeon crawler games
- Designed for the Replit platform and community

---

**Happy Crawling!** 🕳️⚔️
