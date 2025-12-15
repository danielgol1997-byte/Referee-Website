# Deployment Notes

This project is configured for local development with a self-contained Postgres instance (started by `START.command`) and can be deployed to any Postgres-compatible environment. Use this checklist when handing over or publishing.

## Local development
- Run `./START.command` (double-click) to:
  - Start a local Postgres cluster at port `5434` with DB `referee_training` and user `referee_admin/referee_password`.
  - Apply Prisma migrations (`prisma/migrations/0001_init.sql`, `0002_add_mandatory_tests.sql`).
  - Seed sample data (users and mandatory tests).
  - Start Next.js dev server at `http://localhost:3000`.
- Local `DATABASE_URL` used by the script:
  - `postgresql://referee_admin:referee_password@localhost:5434/referee_training`

Seeded accounts (after `prisma db seed`):
- Referee: `referee@example.com` / `password123`
- Admin: `admin@example.com` / `password123`
- Super Admin: `super@example.com` / `password123`

## Environment variables
Set these in `.env` (local) or your hosting provider (staging/prod):
- `DATABASE_URL` (required)
- `NEXTAUTH_SECRET` (required; generate with `openssl rand -hex 32`)
- `NEXTAUTH_URL` (e.g., `https://your-domain.com` in production)
- OAuth providers as needed: `GOOGLE_CLIENT_ID/SECRET`, `APPLE_CLIENT_ID/SECRET`, `FACEBOOK_CLIENT_ID/SECRET`

## Database migrations (staging/prod)
1) Point `DATABASE_URL` to the target Postgres instance.
2) Apply migrations:
   ```
   npx prisma migrate deploy
   ```
3) Seed data (optional but recommended for initial roles/content):
   ```
   npx prisma db seed
   ```
   - The seed script is idempotent (uses upserts).

## Running the app (staging/prod)
- Install dependencies: `npm install`
- Build: `npm run build`
- Start: `npm run start`
- Ensure `DATABASE_URL` and `NEXTAUTH_SECRET` are set in the environment for the running process.

## Notes on roles and admin UI
- Super Admin access: protects `/super-admin/*` routes; requires role `SUPER_ADMIN`.
- Admin/super-admin APIs live under `/api/admin/*`.
- Mandatory tests and law-number filters rely on migrations up to `0002_add_mandatory_tests.sql`.

## If you need to reset local data
- Stop the dev server.
- Remove the temp cluster: `rm -rf ${TMPDIR:-/tmp}/rtw-pg`.
- Rerun `./START.command` to recreate DB, apply migrations, and seed.
