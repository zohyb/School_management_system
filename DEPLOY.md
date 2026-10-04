# Deploying SMS

## What runs where

| Piece | Type | Default port |
|---|---|---|
| `server` | Node API | 4000 |
| `apps/landing` | Static site | 5174 (dev) |
| `apps/app` | Static site | 5173 (dev) |
| `apps/admin` | Static site | 5175 (dev) |
| MySQL 8 | Database | 3306 |

In production, build the three apps (`npm run build --workspace=@sms/landing` etc.)
and serve each `dist/` from a web server or static host. Point them at the API
with `VITE_API_URL=https://api.yourdomain.com` at build time. Run the API with
`npm run build --workspace=@sms/server` then `node server/dist/index.js`.

## Database

1. Create the database and user (see `scripts/setup-mysql.sh` for Ubuntu).
2. Copy `server/.env.example` to `server/.env` and fill in credentials plus a
   long random `JWT_SECRET`.
3. `npm run db:migrate` applies `db/migrations` in order. Migrations are
   append-only: never edit an applied file, add a new numbered one instead.
4. `npm run db:seed` loads demo data (school `city-grammar`, all users password
   `demo1234`). Do not run seeds in production.

## First admin user

There is no signup form for platform admins. Insert one directly:

```sql
INSERT INTO users (school_id, name, email, password_hash, role)
VALUES (NULL, 'Your Name', 'you@yourdomain.com', '<bcrypt hash>', 'super_admin');
```

Generate the bcrypt hash with:
`node -e "console.log(require('bcryptjs').hashSync('choose-a-password', 10))"`
run from the repo root after `npm install`.

Each school's first `school_admin` login is created the same way with that
school's id, or from the SaaS admin panel once you add user management there.

## Notes

- Every school-scoped table carries `school_id`. The API derives it from the
  login token, never from client input.
- Back up MySQL daily. Fee vouchers and marks are append-mostly; a nightly
  `mysqldump` is enough for most schools.
