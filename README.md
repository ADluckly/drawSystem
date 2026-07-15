# drawSystem

Drawing Training Check-in System.

Phase 0 + Phase 1 + Phase 2 MVP baseline based on Next.js 15 App Router + TypeScript.

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
- `AUTH_COOKIE_NAME`
- `BOOTSTRAP_SUPER_KEY`

4. Start development server

```bash
npm run dev
```

Visit http://localhost:4000

## Bootstrap Super Account

Before using account management, initialize a first `super` account once:

```bash
curl -X POST http://localhost:4000/api/admin/bootstrap-super \
	-H "Content-Type: application/json" \
	-d '{
		"bootstrapKey": "your-BOOTSTRAP_SUPER_KEY",
		"username": "superadmin",
		"password": "StrongPassword123"
	}'
```

After bootstrapping, login at `/login` and manage child accounts in `/admin/accounts`.

## Commands

- `npm run dev`: start local development server
- `npm run lint`: run ESLint
- `npm run typecheck`: run TypeScript type checking
- `npm run build`: build production bundle
- `npm run start`: run production server
- `npm test`: run unit and integration tests
- `npm run test:coverage`: run test coverage report

## Phase 0 Baseline

- Startup env validation with fail-fast behavior
- Reusable MongoDB connection utility with hot-reload cache
- Global Ant Design provider and layout shell
- Unified API error response helpers
- Core directories prepared: app, api, models, lib, store, components

## Phase 1 Auth and RBAC

- Admin model with roles: `super`, `admin`, `teacher`
- JWT login/logout/me APIs with HttpOnly cookie session
- Route middleware guard + API-level secondary authorization
- Role-based menu visibility and protected page layouts
- Super-only account management APIs and UI
- Permission matrix: `doc/permission-matrix-phase1.md`

## Phase 2 Core MVP

- Models: `Student`, `Recharge`, `Sign`, `Course`, `Class`
- Student management with filter and detail aggregation (recharge/sign history)
- Recharge workflow with serial number, idempotency key, and atomic lesson update
- Single student sign workflow with leave support (leave does not decrement lessons)
- Same-day duplicate sign protection by business check + unique index
- Lesson warning API and dashboard warning card
- Key coverage: lesson ledger unit tests + recharge/sign integration tests
