# Tech Stack

## Backend
- **Node.js** with **TypeScript**
- **Express** for HTTP APIs and session management

## Database
- **PostgreSQL** (hosted via [Neon](https://neon.tech/))
- **Drizzle ORM** for type-safe database access
- **connect-pg-simple** for storing sessions in Postgres

## In-Memory / Real-Time Data
- **ioredis** for fast, in-memory data storage (game state, caching, etc.)
- **Upstash** for managed, serverless Redis (cloud-hosted Redis instance)

## Real-Time Communication
- **ws** WebSocket library

## Authentication
- **Passport** for authentication middleware
- **openid-client** for OpenID Connect (e.g., Replit or other providers)

---

This setup supports scalable, type-safe APIs with real-time features, secure authentication, and cloud-native in-memory data storage for MMO-style game state and caching.