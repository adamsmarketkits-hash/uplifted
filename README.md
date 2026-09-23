# UpLifted

Mobile-first web app for logging workouts (weight × reps), seeing daily and weekly volume, and competing with up to six family members on volume and a **3 workouts / week** consistency goal.

## What it does

- Create a family (invite code) or join with that code
- Each person uses a display name + PIN (no email)
- Start a workout, add exercises, log sets, check them off
- **Volume** = completed sets `weight × reps` (lbs)
- Family board ranks weekly volume and shows a fitter / in-between / fatter icon from workouts this week (Mon–Sun, your timezone)
- Tap a name to see that person’s sessions this week
- Switch member keeps the family on this device

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The default `DATABASE_URL` is PGlite (`pglite:./data/uplifted`). If the project path contains `[brackets]`, data is stored in the OS temp directory instead (`uplifted-pglite`) so Windows mkdir works. Schema is created automatically on first run.

Create a family, share the invite code, and join from another browser profile as a second member.

`SESSION_SECRET` must be at least 16 characters. Change it before any real deploy.

### Hosted Postgres instead

Set `DATABASE_URL` to a Postgres URL (Docker Compose is included, or [Neon](https://neon.tech) with `sslmode=require`). Schema is applied on first connect. Optional: `npm run db:push` if you prefer Drizzle Kit.

```bash
docker compose up -d
# DATABASE_URL=postgres://strongfam:strongfam@localhost:5432/strongfam
```

## Deploy (family from anywhere)

1. Create a Postgres database (Neon, Vercel Postgres, etc.).
2. Deploy the Next.js app to [Vercel](https://vercel.com) (or any Node host).
3. Set environment variables:
   - `DATABASE_URL` — Postgres connection string (`postgres://…`)
   - `SESSION_SECRET` — long random string
4. Open the site once so tables are created, or run `npm run db:push` against production.

Production cookies are `secure`, so the app must be served over HTTPS. Use Postgres in production, not the local PGlite file.

## Stack

Next.js (App Router), Tailwind CSS, Drizzle ORM, Postgres (PGlite locally), signed cookie sessions (`jose`).
