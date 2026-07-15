# drawSystem

Drawing Training Check-in System.

Phase 0 foundation based on Next.js 15 App Router + TypeScript.

## Tech Stack

- Next.js 15 + TypeScript
- Ant Design
- MongoDB + Mongoose
- Zustand
- dayjs / bcryptjs / jsonwebtoken / xlsx

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create local env file

```bash
cp .env.example .env.local
```

3. Fill required values in `.env.local`

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

4. Start development server

```bash
npm run dev
```

Visit http://localhost:3000

## Commands

- `npm run dev`: start local development server
- `npm run lint`: run ESLint
- `npm run typecheck`: run TypeScript type checking
- `npm run build`: build production bundle
- `npm run start`: run production server

## Phase 0 Baseline

- Startup env validation with fail-fast behavior
- Reusable MongoDB connection utility with hot-reload cache
- Global Ant Design provider and layout shell
- Unified API error response helpers
- Core directories prepared: app, api, models, lib, store, components
