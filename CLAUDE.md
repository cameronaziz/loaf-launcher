# Loaf Launcher

Social media scheduling app for Rozzy the corgi's Instagram. Built on top of Postiz (open source), rebranded and extended for personal use by Cameron and his girlfriend.

## Stack

- **Monorepo** managed with `pnpm` — never use npm or yarn
- **Frontend**: Next.js (App Router), Tailwind CSS, SWR — `apps/frontend`
- **Backend**: NestJS — `apps/backend`
- **Orchestrator**: NestJS + Temporal workflows — `apps/orchestrator`
- **Shared libraries**: `libraries/` — shared between all apps
- **Database ORM**: Prisma — schema at `libraries/nestjs-libraries/src/database/prisma/schema.prisma`
- **Workers**: Cloudflare Worker cron at `workers/analytics-cron`

## Infrastructure

| Name | Service | Notes |
|---|---|---|
| bones | Neon Postgres | Primary DB |
| socks | Upstash Redis | TLS — use `rediss://` |
| walkies | Temporal (Railway) | Workflow engine |
| fetch | NestJS + Next.js backend (Railway) | Port 5000 via nginx |
| woof | Cloudflare Pages | Unused — fetch serves the full app |
| sniffs | Cloudflare Worker | Analytics cron |

**Live URL**: `https://loaf-launcher.camandash.com`
**Railway project**: `loaf-launcher` (workspace: Loaf Launcher)

## Deploy

```bash
# Deploy to Railway (builds from local source via CLI)
RAILWAY_API_TOKEN=$RAILWAY_API_TOKEN railway up --detach

# Push schema changes to Neon
pnpm run prisma-db-push

# Deploy CF Worker cron
cd workers/analytics-cron && npx wrangler deploy
```

## Custom features (not in upstream Postiz)

- **Analytics persistence** — `PostAnalytics` and `ApiCallLog` Prisma tables store Instagram metrics locally instead of fetching live every time
- **Analytics sync service** — `libraries/nestjs-libraries/src/database/prisma/analytics/` — fetches from Instagram, stores to DB, throttles at 160 API calls/hour
- **POST /analytics/sync** — unauthenticated endpoint secured by `x-sync-key` header (`ANALYTICS_SYNC_KEY` env var), called by the CF Worker cron
- **Refresh button** — UI shows last-fetched timestamp and a manual refresh button in the analytics view
- **Zoho OAuth** — `apps/backend/src/services/auth/providers/zoho.provider.ts` — SSO via camandash.com Zoho account

## Key env vars

All env vars are in `.env` (gitignored). Canonical reference at `.env.northflank` (also gitignored, misnamed — actually Railway vars).

- `DATABASE_URL` — Neon pooler connection string, must include `?sslmode=require`
- `REDIS_URL` — Upstash, must be `rediss://` (double s for TLS)
- `ANALYTICS_SYNC_KEY` — shared secret between backend and CF Worker
- `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` — Zoho OAuth app credentials
- `CLOUDFLARE_*` — R2 storage for media uploads

## Design system

Brand guide at `branding/loaf_launcher/DESIGN.md`. Key points:
- **Primary (Crust Gold)**: `#8d4f11`
- **Secondary (Electric Violet)**: `#5b3cdd`
- **Background (Yeasty Cream)**: `#fff8f5`
- **Headlines**: Quicksand
- **Body**: Plus Jakarta Sans
- Style: soft-modern, pill shapes, rounded-xl, warm and playful

## Dev setup (local)

```bash
# Start required services
temporal server start-dev       # in a separate terminal
brew services start postgresql@14
brew services start redis

# Install and run
pnpm install
pnpm run prisma-db-push
pnpm run dev
```

App runs at `http://localhost:4200`.

## Rules

- Only use `pnpm`
- Don't write frontend components from npm — write native ones
- Don't add co-authored-by to commits
- Don't commit `.env` or `.env.northflank`
- The nginx config at `var/docker/nginx.conf` proxies port 5000 → backend (3000) and frontend (4200)
