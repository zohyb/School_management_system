# SMS: School Management System (SaaS)

A web-based school management system sold as a subscription service.

## Structure

```
apps/
  landing/   Marketing site: home, pricing, privacy policy, terms, signup
  app/       School dashboard: the product schools use every day
  admin/     SaaS admin panel: schools, plans, subscriptions, invoices (super-admin only)
packages/
  ui/        Shared design system (Tailwind v4 theme + components)
server/      Express + TypeScript REST API (MySQL)
db/
  migrations/ Numbered SQL migrations, applied in order
  seeds/       Demo data for local development
scripts/     migrate.mjs / seed.mjs runners
```

## Local setup

1. Install MySQL 8 and create the database (or run `scripts/setup-mysql.sh` on Ubuntu):
   ```sql
   CREATE DATABASE sms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Copy `server/.env.example` to `server/.env` and set `DB_*` values.
3. `npm install`
4. `npm run db:migrate` then `npm run db:seed`
5. `npm run dev:server` (API on :4000), then `npm run dev:app` (:5173),
   `npm run dev:landing` (:5174), `npm run dev:admin` (:5175).

## Conventions

- Every table carries `school_id` (multi-tenant). The API always scopes queries
  to the caller's school; `school_id` never comes from client input.
- Migrations are append-only and numbered (`001_`, `002_`, ...).
- UI copy avoids em dashes, emoji icons, and placeholder marketing claims.
