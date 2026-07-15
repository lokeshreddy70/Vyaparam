# Vyaparam — Phase 1: Core Engine + Restaurant Vertical

This is the first working slice of Vyaparam: a real, end-to-end-functional
system, not a scaffold. It covers the shared multi-tenant engine (auth, RBAC,
products, categories, customers) plus a complete Restaurant vertical (tables,
KOT/kitchen display, dine-in ordering, billing, payments).

**What "Phase 1" means:** the full Vyaparam vision (16 business verticals,
offline sync, AI features, full test/DevOps suite) is a multi-month build.
Rather than generate thousands of files of unfinished scaffolding, this phase
delivers one vertical fully wired to a real Postgres database so you can run
it, seed it, and actually use it today. Later phases extend the same engine
with more verticals and features — see "Roadmap" below.

## Stack

- **Backend**: NestJS, TypeScript, Prisma, PostgreSQL, Socket.IO, JWT (access + refresh), RBAC
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, Socket.IO client
- **Infra**: Docker Compose (Postgres, Redis, backend, frontend)

## What's implemented

- Multi-tenant data model (`Business` scopes every record)
- JWT auth with refresh tokens (hashed & rotated), RBAC guards for
  Owner / Manager / Cashier / Kitchen Staff / Waiter
- Forgot/reset password via OTP (logged to console in dev — wire to
  SMS/email in Phase 2)
- Staff creation by Owner/Manager
- Products & categories (paginated, searchable)
- Restaurant tables with live status (available/occupied/reserved/cleaning)
- Order creation with KOT (kitchen order ticket) items
- Kitchen Display with live WebSocket updates (queued → preparing → ready → served)
- Billing: invoice generation from a served order, GST-style tax calc,
  multiple payment methods, partial payments, daily sales report
- Audit log on login (extend to other actions as needed)
- Seed script for environment-configured bootstrap data

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Then, once the backend container is healthy, seed bootstrap data:

```bash
docker compose exec backend npx prisma migrate dev --name init
docker compose exec backend npm run prisma:seed
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api/v1

## Local development (without Docker)

Backend:
```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run start:dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Project structure

```
vyaparam/
├── backend/
│   ├── prisma/schema.prisma      # multi-tenant data model
│   ├── prisma/seed.ts            # bootstrap seed data
│   └── src/
│       ├── auth/                 # JWT, refresh, RBAC, OTP reset
│       ├── products/ categories/ # shared catalog engine
│       ├── tables/               # restaurant tables
│       ├── orders/               # KOT + kitchen WebSocket gateway
│       ├── billing/              # invoices + payments
│       └── common/               # guards, decorators
├── frontend/
│   └── src/
│       ├── api/client.ts         # axios + auto refresh-token retry
│       ├── store/authStore.ts    # zustand auth state
│       └── pages/                # Login, Dashboard, Tables, KitchenDisplay, POS
└── docker-compose.yml
```

## Roadmap (not built yet — next phases)

1. **More verticals** on the same engine: Grocery/Supermarket (barcode,
   offers), Medical/Pharmacy (batch/expiry/prescriptions), Cement/Hardware
   (contractors, delivery tracking). Each adds its own Prisma models and
   NestJS modules without touching the core engine.
2. **Offline billing**: IndexedDB queue + background sync + conflict
   resolution for the POS screen.
3. **Inventory depth**: purchase orders, stock transfer, low-stock/expiry
   alerts, batch tracking.
4. **AI-ready hooks**: sales/demand prediction endpoints, smart reports.
5. **Hardening for scale**: full test suite (unit/integration/e2e),
   query optimization and indexing for 100k+ SKUs, CI/CD.

## Security notes for production

- Replace the `.env.example` JWT secrets with strong random values.
- The password-reset OTP store is in-memory for this phase — move to Redis
  before running more than one backend instance.
- Add rate limiting rules per endpoint beyond the global throttle already in
  `app.module.ts`.
