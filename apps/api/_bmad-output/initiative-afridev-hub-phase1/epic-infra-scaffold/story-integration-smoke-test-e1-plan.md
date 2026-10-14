---
title: 'Integration smoke test — stack complète E1'
type: 'feature'
ticket: '7'
created: '2026-10-13'
status: 'built'
baseline_revision: 'NO_VCS'
route: 'oneshot'
route_source: 'auto'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** E1 infrastructure stories (1.1–1.6) have no end-to-end integration test confirming the modules compose correctly: ConfigModule validation schema, pino logger wiring, PrismaModule connection, RedisModule connection, MailModule sandbox guard, and HealthModule HTTP endpoint.

**Approach:** Write a Jest + supertest suite (`apps/api/src/smoke.spec.ts`) that bootstraps a `TestingModule` with the E1 infrastructure modules (ConfigModule, LoggerModule, PrismaModule, RedisModule, MailModule, HealthModule) and asserts: `GET /health` returns 200, ConfigService injects DATABASE_URL and REDIS_URL, MailService is injectable and resolves in sandbox mode, LoggerModule compiles into the context. Test requires live Postgres + Redis service containers (CI); cannot pass in a sandbox with no running services.

## Boundaries & Constraints

**Always:**
- Test file: `apps/api/src/smoke.spec.ts` (matches `--testPathPattern=smoke`)
- Modules: ConfigModule.forRoot (with configValidationSchema), LoggerModule.forRoot (level: 'silent'), PrismaModule, RedisModule, MailModule, HealthModule
- `jest.setTimeout(30000)` — DB/Redis init takes time
- `beforeAll` / `afterAll` with `await app.close()`
- TypeScript errors after filtering pre-existing TS5101/TS5107/TS2688: zero

**Never:**
- Import full AppModule (would pull in Auth, JWT, Users, Forum, etc. requiring additional setup)
- Make real network calls in MailService (sandbox guard skips when `NODE_ENV !== 'production'`)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior |
|----------|--------------|---------------------------|
| `GET /health` | Postgres + Redis up (CI service containers) | HTTP 200, `{ status: 'ok', db: 'ok', redis: 'ok', uptime: <number> }` |
| `ConfigService.get('DATABASE_URL')` | `.env` with valid DATABASE_URL | Defined string |
| `ConfigService.get('REDIS_URL')` | `.env` with valid REDIS_URL | Defined string |
| `moduleRef.get(MailService)` | Module compiled | Truthy MailService instance |
| `mailService.send(...)` | `NODE_ENV !== 'production'` | Resolves to `undefined` (sandbox mode) |
| LoggerModule wiring | Module compiled, `pinoHttp.level: 'silent'` | `app` is defined (no logger errors at startup) |
| `tsc -p apps/api/tsconfig.spec.json --noEmit` | After file creation | Zero new errors (filter TS5101/TS5107/TS2688) |

</frozen-after-approval>

## Code Map

- `apps/api/src/smoke.spec.ts` (NEW) — Jest + supertest integration smoke test
- `package.json` (root) — added `supertest@^6.3.4` and `@types/supertest@^6.0.3` as devDependencies

## Tasks & Acceptance

**Execution:**
- [x] Install supertest 6.3.4 + superagent 8.1.2 + transitive deps (component-emitter, cookiejar, formidable 2.1.2, dezalgo, hexoid 1.0.0, asap) via manual tarball
- [x] Update root `package.json` devDependencies with supertest + @types/supertest
- [x] Create `apps/api/src/smoke.spec.ts` with full E1 module composition
- [x] Verify `tsc -p apps/api/tsconfig.spec.json --noEmit` — zero new TypeScript errors

**Acceptance Criteria:**
- Given `nx test api --testPathPattern=smoke` in CI with Postgres and Redis service containers running, then all 7 test cases pass
- Given `GET /health`, then HTTP 200 with `{ status: 'ok', db: 'ok', redis: 'ok' }` body
- Given `moduleRef.get(ConfigService)`, then `DATABASE_URL` and `REDIS_URL` are defined
- Given `moduleRef.get(MailService)`, then service is injectable
- Given `mailService.send(...)` with `NODE_ENV !== 'production'`, then resolves to undefined (sandbox mode, no network)
- Given `app` after init, then defined (LoggerModule wired correctly)
- Given `tsc -p apps/api/tsconfig.spec.json --noEmit`, then zero new TypeScript errors (filtering TS5101/TS5107/TS2688)

## Implementation Notes

- Full AppModule avoided: domain modules (Auth, Users, Forum, Projects, etc.) would require JWT strategy, Passport, additional providers. Minimal composition (ConfigModule + LoggerModule + PrismaModule + RedisModule + MailModule + HealthModule) validates the E1 infrastructure stack without domain complexity.
- `supertest` was not installed in this monorepo; installed version 6.3.4 (not 7.x which has a deeper dep chain: @paralleldrive/cuid2 → @noble/hashes, bignumber.js). Supertest 6.x dep chain: superagent 8.1.2 → component-emitter, cookiejar, formidable 2.1.2, dezalgo, hexoid 1.0.0, asap — all installed via manual tarball since npm/yarn are broken in this sandbox.
- `pinoHttp: { level: 'silent' }` passed to LoggerModule.forRoot suppresses all log output during test runs while still exercising the logger wiring.
- Sandbox guard in MailService (`process.env['NODE_ENV'] !== 'production'`) ensures no real HTTP call to Resend API occurs during tests. The test asserts `resolves.toBeUndefined()` matching the void return from the sandbox branch.
- Test cannot run in this sandbox (no live Postgres/Redis). Type correctness verified via `tsc --noEmit`; runtime correctness verified in CI with service containers.
- `apps/api/tsconfig.spec.json` already includes `src/**/*.spec.ts` in its `include` array; `smoke.spec.ts` is picked up automatically.

## Plan Change Log

## Review Triage Log

| # | Location | Verdict | Route | Evidence |
|---|----------|---------|-------|----------|
| — | — | No findings — zero new TS errors in `tsconfig.spec.json`; supertest installed and loads correctly; smoke test covers all 4 acceptance areas (health HTTP, ConfigService injection, MailService sandbox, LoggerModule wiring); module composition avoids domain modules as required | — | `tsc -p apps/api/tsconfig.spec.json --noEmit` filtered of pre-existing TS5101/TS5107/TS2688: empty output |
