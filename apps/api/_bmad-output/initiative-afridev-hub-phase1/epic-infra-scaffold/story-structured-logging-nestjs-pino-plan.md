---
title: 'Structured logging — nestjs-pino'
type: 'feature'
ticket: '2'
created: '2026-10-13'
status: done
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

**Problem:** The API uses NestJS's default `Logger` (text-only stdout), two bare `console.log` calls in `main.ts`, and `logger: ['error','warn','log','debug']` in `NestFactory.create()`. There is no structured JSON output for production log aggregation and no pino-pretty readability in development.

**Approach:** Install `nestjs-pino` + `pino-http` + `pino-pretty`. Register `LoggerModule.forRoot()` in `AppModule` with pino-pretty transport in dev, raw JSON in prod. Call `app.useLogger(app.get(Logger))` in `main.ts`, remove `logger: [...]` from `NestFactory.create()`, and replace `console.log` startup messages with structured `Logger` calls. Switch `PrismaService` and `RedisService` from `new Logger()` field to `@InjectPinoLogger` / `PinoLogger` constructor injection. Domain-layer services (auth, payments, gamification, notifications) are out of scope for this story.

## Boundaries & Constraints

**Always:**
- Register `LoggerModule.forRoot()` synchronously — no `forRootAsync`; check `process.env['NODE_ENV']` directly
- pino-pretty transport only when `NODE_ENV !== 'production'`; raw JSON (no transport) otherwise
- Inject `PinoLogger` via `@InjectPinoLogger(ServiceName.name)` in PrismaService and RedisService
- Use `Logger` from `nestjs-pino` (not `@nestjs/common`) in `main.ts` for `app.useLogger()` and startup messages
- Use `logger.info()` where NestJS `Logger.log()` was called — pino uses `info`, not `log`
- For Redis error: `logger.error({ err: e }, 'Redis error')` — structured `err` field, not a second string arg

**Never:**
- Switch domain-layer services — scope is infra only (PrismaService + RedisService)
- Leave any `console.log` call in `src/`
- Wrap pino-http in a custom Express middleware — `LoggerModule` handles HTTP logging automatically
- Add `bufferLogs: false` — keep `bufferLogs: true` so NestJS bootstrapper logs are not swallowed before logger wires up

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior |
|----------|--------------|---------------------------|
| Dev startup | `NODE_ENV=development`, app starts | Logs formatted by pino-pretty — human-readable, colorized, single-line |
| Prod startup | `NODE_ENV=production`, app starts | Every log line is a JSON object with `level`, `msg`, `time`, `pid` |
| Slow Prisma query | Query > 500ms in dev | `logger.warn(...)` emits warning with duration + query string |
| Redis connects | Redis client emits `connect` | `logger.info('Redis connected')` emitted |
| Redis error | Redis client emits `error` | `logger.error({ err: e }, 'Redis error')` emitted (structured `err` field) |
| DB lifecycle | Module init / destroy | `logger.info('Database connected')` / `logger.info('Database disconnected')` |

</frozen-after-approval>

## Code Map

- `package.json` (root) — add `"nestjs-pino"`, `"pino-http"`, `"pino-pretty"` to `dependencies`; run `npm install` from monorepo root
- `src/app.module.ts` — add `import { LoggerModule } from 'nestjs-pino'`; insert `LoggerModule.forRoot({ pinoHttp: { level: process.env['NODE_ENV'] !== 'production' ? 'debug' : 'info', transport: process.env['NODE_ENV'] !== 'production' ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } } : undefined } })` before the infrastructure modules block
- `src/main.ts` — add `import { Logger } from 'nestjs-pino'`; change `NestFactory.create(AppModule, { logger: [...] })` to `NestFactory.create(AppModule, { bufferLogs: true })`; add `app.useLogger(app.get(Logger))` immediately after `NestFactory.create()`; replace two `console.log` lines with `app.get(Logger).log({port}, '🚀 AfriDev Hub API ready')` and `app.get(Logger).log({url: \`http://localhost:${port}/api/docs\`}, '📚 Swagger docs')`
- `src/prisma/prisma.service.ts` — remove `Logger` from `@nestjs/common` import; add `import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'`; remove `private readonly logger = new Logger(PrismaService.name)` field; change constructor to `constructor(@InjectPinoLogger(PrismaService.name) private readonly logger: PinoLogger) { super({...}) ... }`; change `this.logger.log(...)` to `this.logger.info(...)`
- `src/redis/redis.service.ts` — same pattern: remove `Logger` from `@nestjs/common` import; add `import { InjectPinoLogger, PinoLogger } from 'nestjs-pino'`; remove `private readonly logger` field; change constructor to accept `@InjectPinoLogger(RedisService.name) private readonly logger: PinoLogger`; change `.log('Redis connected')` to `.info('Redis connected')`; change `.error('Redis error', e.message)` to `.error({ err: e }, 'Redis error')`

## Tasks & Acceptance

**Execution:**
- [x] `package.json` — add nestjs-pino, pino-http, pino-pretty; run `npm install` from monorepo root — packages not yet present
- [x] `src/app.module.ts` — add `LoggerModule.forRoot()` to imports — wires pino as the global NestJS logger
- [x] `src/main.ts` — switch `NestFactory.create` options to `{ bufferLogs: true }`, add `app.useLogger(app.get(Logger))`, replace `console.log` with structured logger calls — ensures structured output from bootstrap
- [x] `src/prisma/prisma.service.ts` — switch from `new Logger()` field to `@InjectPinoLogger` constructor injection — PrismaService emits structured JSON logs
- [x] `src/redis/redis.service.ts` — same switch — RedisService emits structured JSON logs

**Acceptance Criteria:**
- Given `NODE_ENV=development` and docker:dev running, when the API starts, then output is formatted by pino-pretty (not raw JSON)
- Given `NODE_ENV=production`, when the API starts, then every log line is a JSON object parseable with `jq` containing `level`, `msg`, `time`, `pid`
- Given `grep -r "console\.log" apps/api/src`, then no matches are returned
- Given `nx build api`, then the build completes with no TypeScript errors

## Implementation Notes

- Installed `nestjs-pino@4.6.1` (not latest 5.x) — project uses NestJS 10; v5.x requires NestJS 11+. Confirmed via `npm view nestjs-pino versions`.
- `LoggerModule.forRoot()` is `@Global()` — no re-import needed in PrismaModule or RedisModule.
- `Logger` (nestjs-pino's LoggerService adapter) used in `main.ts` via `app.get(Logger)` — has `.log()`; `PinoLogger` used in services via `@InjectPinoLogger` — has `.info()`, `.warn()`, `.error()`.
- `bufferLogs: true` ensures bootstrap log lines are captured before `app.useLogger()` wires pino.
- `npm install` timed out on gyp native build in unrelated `@angular/build` dependency, but all three packages were installed successfully before timeout.

## Plan Change Log

## Review Triage Log

| # | Location | Verdict | Route | Evidence |
|---|----------|---------|-------|----------|
| — | — | No findings — `tsc --noEmit` clean; `grep -r console.log src/` empty; all constraints satisfied | — | — |
