<!-- bmad:context -->
<!-- Verified 2026-10-14 against 65cf5de. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## afridev-hub/api

NestJS 10 REST + WebSocket API for AfriDev Hub. TypeScript, Prisma 5, PostgreSQL, Redis. Part of an Nx monorepo: run every command from the monorepo root, not `apps/api/`. Contracts and planning live in `_bmad-output/`.

## Policy

- Conventional Commits for every commit. Push only when asked.
- Never run `npx`, `npm run` or `nest` inside `apps/api/`; use the root `npm run` scripts or `nx` targets.
- Never hand-edit `node_modules/` or the generated Prisma client; run `npm run prisma:generate` after any schema change.
- Never run `prisma db push` on the shared dev database. Schema changes go through `npm run prisma:migrate`, and the generated folder in `prisma/migrations/` is committed with them.
- Never commit `.env` or `.env.local`. Personal config `_bmad/custom/*.user.toml` is gitignored.

## Where things are

- Entry point `src/main.ts`; module wiring `src/app.module.ts`. Global prefix `/api` except `/health`. Swagger at `/api/docs`, outside production only.
- Domain modules under `src/{auth,users,forum,votes,projects,jobs,payments,gamification,notifications,moderation,admin,health}/`. Cross-cutting code in `src/common/`: error codes, response envelope, Swagger models, tag helper.
- Prisma schema, migrations and seed: `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`.
- Shared types and error codes: `libs/shared-types/src/index.ts`.
- Data contract (fields, enums, business rules, known gaps): `_bmad-output/architecture-afridev-hub-phase1/data-contract-afridev-hub-phase1.md`. Architecture conventions: `_bmad-output/architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md`.
- Docker services (Postgres, Redis): `docker-compose.yml` at the monorepo root.

## Running and verifying

- Dev API: `npm run start:api` (`nx serve api`), port 3000.
- Native PostgreSQL already on 5432 (Homebrew): run `POSTGRES_HOST_PORT=5433 npm run docker:dev` and point `.env.local` at `localhost:5433`.
- `.env.local` overrides `.env` for the API, because the config module loads it first. The Prisma CLI reads only `.env`: pass `DATABASE_URL` and `DIRECT_URL` inline when migrating another database.
- Migrations: `npm run prisma:migrate` (dev, creates and applies), `npm run prisma:migrate:prod` (deploy only). Status from the root: `npx prisma migrate status --schema prisma/schema.prisma`.
- Seed: `npm run prisma:seed`. Idempotent upserts.
- Build: `nx build api`. Its `rootDir` is the monorepo root so `libs/shared-types` resolves; do not change it.
- Type check: `npx tsc --noEmit -p apps/api/tsconfig.app.json`.
- `nx test api` fails before any test runs: the installed `@nestjs/testing` lacks its `.d.ts` files. This is an install problem, not a code failure.

## Conventions that differ from defaults

- Auth is per route: `@UseGuards(JwtAuthGuard)`, plus `RolesGuard` with `@Roles`. There is no global guard and no `@Public()` decorator: a route without a guard is public.
- Errors: throw `DomainException(code, message, status)` from `src/common/errors/domain.exception.ts`. Codes use `DOMAINE_ENTITE_RAISON` and must exist in `ErrorCode` in `libs/shared-types`. Framework exceptions map to `COMMON_*` automatically.
- Success responses are wrapped in `{ data }`, lists in `{ data, meta }`. Return the plain value from the service; do not wrap it yourself.
- Reputation: only `GamificationModule` writes `User.reputation`. Other modules emit `forum.question.created`, `forum.answer.created`, `forum.answer.accepted` or `votes.vote.changed` through `EventEmitter2`, and never import another domain module.
- DTO enums import from `@prisma/client`. The enums in `libs/shared-types` mirror them and must stay identical to `schema.prisma`.
- Identifiers are UUID v4 (`@default(uuid())`). Money is stored as integer base units, never float.
- Use injected services only: `PrismaService` for all database access, `RedisService` for Redis.
- Swagger: a controller's `@ApiTags` name must match the spelling in `main.ts`'s `addTag` list, or tags duplicate. Responses use `@ApiData`.

## Known pitfalls

- `nx serve api` fails with "Failed to process project graph": run `npx nx reset`, then retry.
- Never stop a process with `pkill -f "nx serve api"`: it also kills the maintainer's dev server. Stop your own process by PID.
- `smoke.spec.ts` needs Postgres and Redis up (`npm run docker:dev`); the other specs mock them. Checked by reading the specs, not by running them: `nx test api` cannot run yet.
- `nx serve` watches and hot-reloads. A plain `node dist/...` run does not pick up changes.
- The Prisma client regenerates on `npm install` (`prepare` script). After a schema change, run `npm run prisma:generate` explicitly.

<!-- /bmad:context -->
