<!-- bmad:context -->
<!-- Verified 2026-10-15 against 4d06a44. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## afridev-hub/api

NestJS 10 REST + WebSocket API for AfriDev Hub. TypeScript, Prisma 5, PostgreSQL, Redis. Part of an Nx monorepo: run every command from the monorepo root, not `apps/api/`. Contracts and planning live in `_bmad-output/`.

## Policy

- Conventional Commits for every commit. Push only when asked.
- Never run `npx`, `npm run` or `nest` inside `apps/api/`; use the root `npm run` scripts or `nx` targets.
- Never hand-edit `node_modules/` or the generated Prisma client; run `npm run prisma:generate` after any schema change.
- Never run `prisma db push` on the shared dev database. Schema changes go through `npm run prisma:migrate`, and the generated folder in `prisma/migrations/` is committed with them.
- Never commit `.env` or `.env.local`. Personal config `_bmad/custom/*.user.toml` is gitignored.
- Never paste keys or secrets into a conversation or a commit; a secret that was shared must be rotated at its provider.
- Payments use one aggregator, Bictorys (decision 2026-10-14). Do not add provider-specific code for Wave, Orange Money, MTN or Stripe.

## Where things are

- Entry point `src/main.ts` (raw request bodies enabled, needed for webhook signatures); module wiring `src/app.module.ts`. Global prefix `/api` except `/health`. Swagger at `/api/docs`, outside production only.
- Domain modules under `src/{auth,users,forum,votes,projects,jobs,payments,gamification,notifications,moderation,admin,health,upload}/`. Cross-cutting code in `src/common/`: error codes, response envelope, Swagger models, tag helper.
- Payments provider and webhook: `src/payments/providers/` (Bictorys client, signature rules, status mapping).
- Prisma schema, migrations and seed: `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`.
- Shared types, enums mirror and error codes: `libs/shared-types/src/index.ts`.
- Data contract (fields, enums, business rules, known gaps): `_bmad-output/architecture-afridev-hub-phase1/data-contract-afridev-hub-phase1.md`. Architecture conventions: `_bmad-output/architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md`. Bictorys facts and open points: `_bmad-output/architecture-afridev-hub-phase1/bictorys-integration-notes.md`.
- Docker services (Postgres, Redis): `docker-compose.yml` at the monorepo root.

## Running and verifying

- Dev API: `npm run start:api` (`nx serve api`), port 3000.
- Native PostgreSQL already on 5432 (Homebrew): run `POSTGRES_HOST_PORT=5433 npm run docker:dev` and point `.env.local` at `localhost:5433`.
- `.env.local` overrides `.env` for the API, because the config module loads it first. The Prisma CLI reads only `.env`: pass `DATABASE_URL` and `DIRECT_URL` inline when migrating another database.
- Migrations: `npm run prisma:migrate` (dev, creates and applies), `npm run prisma:migrate:prod` (deploy only). Status from the root: `npx prisma migrate status --schema prisma/schema.prisma`.
- Seed: `npm run prisma:seed`. Idempotent upserts; creates the badge rows the badge logic depends on.
- Build: `nx build api`. Its `rootDir` is the monorepo root so `libs/shared-types` resolves; do not change it.
- Type check: `npx tsc --noEmit -p apps/api/tsconfig.app.json`. Lint: `npx nx lint api` (ESLint config in `apps/api/.eslintrc.json`).
- Unit tests: `npx nx test api`, about 126 tests, no services needed.
- End-to-end auth and profile test: `TEST_DATABASE_URL=… TEST_REDIS_URL=… npx nx test api --testPathPattern=auth.e2e`. Without both variables it is skipped. Never point it at the shared development database.
- Presigned uploads: the object must exist in R2 before `PATCH /api/users/me/avatar` accepts its key; test with a real PUT against the bucket.

## Conventions that differ from defaults

- Auth is per route: `@UseGuards(JwtAuthGuard)`, plus `RolesGuard` with `@Roles`. There is no global guard and no `@Public()` decorator: a route without a guard is public.
- OAuth (GitHub, Google): never link an account automatically. When the email already belongs to an account, a 10-minute link token is issued and the user confirms with that account's password (`POST /api/auth/oauth/link`). OAuth tokens leave the callback in the URL fragment, not the query string.
- Errors: throw `DomainException(code, message, status)` from `src/common/errors/domain.exception.ts`. Codes use `DOMAINE_ENTITE_RAISON` and must exist in `ErrorCode` in `libs/shared-types`. Framework exceptions map to `COMMON_*` automatically.
- Success responses are wrapped in `{ data }`, lists in `{ data, meta }`. Return the plain value from the service; do not wrap it yourself.
- Payments: a webhook never changes a payment on its own. It is signature-checked, matched on amount and currency, then confirmed with Bictorys' status API before settling. A scheduled reconciliation (`@Cron` in `PaymentsService`) settles payments whose webhook was lost. Settlement is conditional on `PENDING`, so a payment is fulfilled at most once.
- Reputation: only `GamificationModule` writes `User.reputation`. Other modules emit events through `EventEmitter2` (names `<module>.<entité>.<action>`, such as `forum.question.created`, `votes.vote.changed`, `users.profile.updated`, `auth.email.verified`) and never import another domain module.
- Verified badge (`dev-verifie`): awarded or revoked by the gamification listener on profile and email events; the criteria are in `src/gamification/verified-badge.ts`.
- Avatars: `POST /api/upload/avatar-presign` returns a signed PUT URL; after the upload, `PATCH /api/users/me/avatar` takes the returned key and stores the public URL.
- DTO enums import from `@prisma/client`. The enums in `libs/shared-types` mirror them and must stay identical to `schema.prisma`.
- Identifiers are UUID v4 (`@default(uuid())`). Money is stored as integer base units, never float.
- Use injected services only: `PrismaService` for all database access, `RedisService` for Redis, `ConfigService` for configuration.
- Swagger: a controller's `@ApiTags` name must match the spelling in `main.ts`'s `addTag` list, or tags duplicate. Responses use `@ApiData`.

## Known pitfalls

- `nx serve api` fails with "Failed to process project graph": run `npx nx reset`, then retry.
- Never stop a process with `pkill -f "nx serve api"`: it also kills the maintainer's dev server. Stop your own process by PID.
- The spec tsconfig must list the `multer` types, or any test importing the application fails to compile.
- The R2 client must set `requestChecksumCalculation: 'WHEN_REQUIRED'`; otherwise the SDK adds checksum parameters to presigned URLs and R2 rejects the signature. The presigned `Content-Length` must equal the real file size.
- Bictorys does not return a `transactionId` for card charges, and its card checkout page returned 404 in sandbox. Do not assume card payments can be tracked by transaction id.
- `nx serve` watches and hot-reloads. A plain `node dist/...` run does not pick up changes.
- The Prisma client regenerates on `npm install` (`prepare` script). After a schema change, run `npm run prisma:generate` explicitly.
- The Google client ID must be the real one from Google Cloud Console; a short placeholder value passes the configuration check and fails at Google.

<!-- /bmad:context -->
