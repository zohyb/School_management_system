# Hybrid Deployment: Vercel (frontends) + Railway (API + MySQL)

This repo is deployed as 4 services:

| Service | Platform | Source |
|---|---|---|
| Marketing site | Vercel | `apps/landing` |
| School dashboard | Vercel | `apps/app` |
| SaaS admin panel | Vercel | `apps/admin` |
| REST API | Railway | `server` |
| MySQL 8 | Railway | one-click plugin |

Deploy the backend first, because the frontends need the API URL.

## Part 1, Railway: MySQL + API

1. Go to railway.app, create an account, then **New Project**.
2. **Add MySQL**: click New, Database, **MySQL**. Railway provisions it and exposes
   `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.
   The API reads these automatically (see `server/src/db.ts`).
3. **Add the API service**: click New, **GitHub Repo**, pick
   `zohyb/school_management_system`.
   - Set **Root Directory** to `server`.
   - Railway auto-detects Node, runs `npm run build`, then starts with
     `node dist/index.js` (see `server/railway.json`; health check is `/health`).
4. On the API service, go to **Variables** and add:
   - `JWT_SECRET` = a long random string (generate with `openssl rand -base64 48`).
     Never use the development placeholder.
   - `JWT_EXPIRES_IN` = `8h`
   - Railway injects `PORT` itself; nothing to do there.
5. **Deploy.** Open the service Settings, generate a public domain, and copy the
   URL, e.g. `https://sms-api-production.up.railway.app`.
   Check `https://<your-api>/health` returns `{"ok":true}`.
6. **Migrate and seed** the Railway database from your machine:
   ```bash
   DB_HOST=<railway-mysql-public-host> DB_PORT=<port> \
   DB_USER=<user> DB_PASSWORD=<redacted> DB_NAME=railway \
   node scripts/migrate.mjs
   ```
   Seed demo data only if you want the demo school (skip for a clean production):
   ```bash
   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=<redacted> DB_NAME=railway \
   node scripts/seed.mjs
   ```
   Railway shows the public connection details in the MySQL service's
   **Connect** tab. The seed creates `admin@sms.local / demo1234` (super admin)
   and the demo school logins; change these passwords immediately after first login.

## Part 2, Vercel: the three frontends

Repeat these steps three times, once per app:

1. Go to vercel.com, **Add New, Project**, import
   `zohyb/school_management_system`.
2. Set the **Root Directory**:
   - Marketing site: `apps/landing`
   - School dashboard: `apps/app`
   - SaaS admin: `apps/admin`
3. Framework preset is auto-detected as **Vite**. Leave build settings as-is.
   Each app has a `vercel.json` with SPA rewrites already.
4. Add the environment variable (same value on all three):
   - `VITE_API_URL` = `https://<your-railway-api-url>` (no trailing slash)
5. **Deploy.** Note each URL, e.g.:
   - `https://sms-landing.vercel.app`
   - `https://sms-app.vercel.app`
   - `https://sms-admin.vercel.app`

Important: `VITE_API_URL` is baked in at build time. If the API URL changes,
update the variable and redeploy the three frontend projects.

## Part 3, after deploy

- Log in to the school app and **change every demo password**.
- In the admin panel, create real plans/schools; the landing trial form posts to
  `/api/trial-requests` on the Railway API.
- Replace `support@sms.local` and placeholder business details in
  `apps/landing/src` before launch.
- Optional hardening: restrict CORS in `server/src/index.ts` to your three
  Vercel domains instead of the current open policy.
