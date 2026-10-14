<!-- bmad:context -->
<!-- Verified 2026-10-13 against HEAD. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## afridev-hub/api

NestJS 10 REST + WebSocket API for AfriDev Hub, an African developer community platform. TypeScript, Prisma ORM, PostgreSQL, Redis. Part of an Nx monorepo rooted two levels up; all commands run from the **monorepo root**, not from `apps/api/`. Planning artifacts and BMAD outputs land in `apps/api/_bmad-output/`.

## Policy

- Use Conventional Commits for every commit.
- Never run `nest`, `npx`, or `npm run` directly inside `apps/api/` — always use `nx` targets from the monorepo root or the root `npm run` scripts.
- Never hand-edit `node_modules/` or Prisma-generated client; run `npm run prisma:generate` after every schema change.
- Never commit `.env` or `_bmad/custom/` files — both are gitignored.
- Push only when explicitly requested.

## Where things are

- Entry point: `apps/api/src/main.ts`; bootstrap in `apps/api/src/app.module.ts`
- Domain modules: `apps/api/src/{auth,users,forum,projects,jobs,payments,gamification,notifications,moderation,votes,admin,redis,prisma}/`
- Prisma schema: `prisma/schema.prisma` (monorepo root)
- Shared TypeScript types: `libs/shared-types/src/`
- Docker services (Postgres + Redis): `docker-compose.yml` at monorepo root
- BMAD skill outputs: `apps/api/_bmad-output/`

## Running and verifying

- Serve in dev: `npm run start:api` (or `nx serve api`) from monorepo root
- Build: `nx build api`
- Test: `nx test api`
- Lint: `nx lint api`
- DB migrate (dev): `npm run prisma:migrate` — requires `DATABASE_URL` in `.env`
- DB migrate (prod): `npm run prisma:migrate:prod`
- Generate Prisma client: `npm run prisma:generate`
- Seed DB: `npm run prisma:seed`
- Start dependent services first: `npm run docker:dev`

## Conventions that differ from defaults

- All database access goes through the injected `PrismaService` (`apps/api/src/prisma/`); never instantiate `PrismaClient` directly.
- Redis access goes through the injected `RedisService` (`apps/api/src/redis/`).
- Monetary amounts are stored as integer cents; never use floats for money.
- WebSocket gateway for real-time notifications is in `apps/api/src/notifications/`.
- JWT guard is applied globally in `app.module.ts`; mark public routes with `@Public()`.

## Known pitfalls

- Tests fail if `docker:dev` services (Postgres, Redis) are not running first.
- `nx serve api` watches for changes and hot-reloads; plain `node dist/apps/api/main.js` does not.
- Prisma client is auto-generated on `npm install` (via `prepare` script); after a fresh `git clone`, run `npm install` before running tests or serve.

<!-- /bmad:context -->
