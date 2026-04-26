# Baengo - Office Bingo Game

Baengo is an office bingo game built with Cloudflare Workers (Hono), D1, React, and Tailwind. Players mark items on a 4x4 grid, score points, and compete on leaderboards.

## Features

- Weekly grids: each player gets one unique 4x4 grid per week.
- Scoring:
   - 10 points for each completed row.
   - 10 points for each completed column.
   - 100 points plus 1 baengo for a full card.
- Leaderboards:
   - Lifetime points ranking.
   - Baengo count ranking.
- Secure auth:
   - Username/password with bcrypt hashing.
   - Access token (15 minutes) plus rotating refresh token (7 days).
   - Account lockout after repeated failed logins.
- Maintenance script to clean stale grids/completions and expired refresh tokens.

## Tech Stack

- Backend: Hono on Cloudflare Workers
- Database: Cloudflare D1 (SQLite)
- Frontend: React + Vite + Tailwind CSS
- Validation: Zod

## Prerequisites

- Node.js 18+ and npm
- Cloudflare account with Workers, D1, and Pages access
- Wrangler CLI (via npx in npm scripts)

## Setup

1. Clone and install dependencies.

```bash
git clone https://github.com/yourusername/baengo.git
cd baengo
npm install
```

2. Configure D1 in wrangler.toml.

- Create a D1 database:

```bash
npx wrangler d1 create baengo-db
```

- Put the created database_id into wrangler.toml (root and production env section if needed).

3. Configure local Worker variables.

- Copy .dev.vars.example to .dev.vars and set JWT_SECRET.

```bash
cp .dev.vars.example .dev.vars
```

- JWT_SECRET must be at least 32 characters.

4. Apply local migrations.

```bash
npx wrangler d1 migrations apply baengo-db --local
```

5. Seed bingo items.

```bash
npm run seed-db -- --local
```

6. Run development servers.

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend (Worker): http://localhost:8787

## Scripts

Root scripts:

- npm run dev
   - Runs backend and frontend dev servers concurrently.
- npm run build
   - Builds backend and frontend.
- npm run deploy
   - Deploys backend Worker and frontend Pages build.
- npm run seed-db [-- --local] [-- --dry-run]
   - Seeds baengo items from config/bingo_items.yaml.
- npm run cleanup-db [-- --local] [-- --dry-run] [-- --env=production] [-- --grid-retention-days=7]
   - Removes stale data:
      - daily_grids older than retention window.
      - completed_rows older than retention window.
      - orphan completed_rows without matching grid.
      - expired refresh_tokens.
- npm run cleanup-db:local
   - Shortcut for local cleanup run.
- npm run cleanup-db:dry-run
   - Shows cleanup counts without deleting rows.

Workspace scripts:

- backend: npm run type-check -w backend
- frontend: npm run type-check -w frontend

## Game Behavior

- The active grid is weekly (Sunday start, Europe/Brussels timezone).
- If a client tries to mark an old grid after rollover, the API returns a conflict so stale grids cannot affect current scoring.
- Scores are cumulative and not reset by weekly grid rollover.

## API Endpoints

Authentication:

- POST /api/auth/register
   - Rate limited to 5 requests per 10 minutes.
- POST /api/auth/login
   - Rate limited to 10 requests per 15 minutes.
- POST /api/auth/refresh
- POST /api/auth/logout

Grid:

- GET /api/grid/today
   - Returns the current week's grid for the authenticated user.
- PATCH /api/grid/mark
   - Marks/unmarks an item and updates score deltas.

Leaderboard:

- GET /api/leaderboard/lifetime?limit=50
- GET /api/leaderboard/baengos?limit=50
- GET /api/leaderboard/user/:userId

## Deployment

Deployments are handled by GitHub Actions on push to main.

Workflow summary:

- Type checks backend and frontend.
- Builds frontend and backend.
- Applies pending D1 migrations to production.
- Syncs production JWT_SECRET to Workers secrets.
- Deploys Worker and Cloudflare Pages frontend.

Required GitHub secrets:

- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_ACCOUNT_ID
- JWT_SECRET

Manual production migration command (if needed):

```bash
npx wrangler d1 migrations apply baengo-db --env production --remote -c wrangler.toml
```

## Project Structure

```
baengo/
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── wrangler.toml
├── config/
│   └── bingo_items.yaml
├── migrations/
├── scripts/
│   ├── seed-db.js
│   └── cleanup-stale-data.js
├── .dev.vars.example
├── package.json
└── wrangler.toml
```

## Troubleshooting

API connection issues:

- Start both services with npm run dev.
- Verify frontend proxy in frontend/vite.config.ts.

Database issues:

- Apply migrations locally:

```bash
npx wrangler d1 migrations apply baengo-db --local
```

- Verify D1 binding and database_id in wrangler.toml.

Auth issues:

- Confirm JWT_SECRET exists in .dev.vars for local dev.
- Clear localStorage and log in again.

## License

Proprietary - AE Internal Use Only
