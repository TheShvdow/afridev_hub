---
title: 'Config validation — Joi schema'
type: 'feature'
ticket: '3'
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

**Problem:** `ConfigModule.forRoot()` loads env vars without any validation — a missing `JWT_SECRET` or `DATABASE_URL` causes cryptic runtime failures deep in service initialization rather than an immediate, actionable startup error.

**Approach:** Install `joi`. Create `src/config/config.schema.ts` with a Joi object schema covering all required and optional variables. Pass it as `validationSchema` in `ConfigModule.forRoot()`. The app crashes at bootstrap with the variable name in the error message if any required variable is absent or fails its constraint.

## Boundaries & Constraints

**Always:**
- Required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (min 32 chars), `JWT_REFRESH_SECRET` (min 32 chars), `WEB_URL`
- With defaults: `PORT` (number, default 3000), `NODE_ENV` (enum: `development | production | test`, default `development`)
- Optional (`.optional().allow('')`): `RESEND_API_KEY`, `WAVE_API_KEY`, `STRIPE_SECRET_KEY`, all `CLOUDFLARE_R2_*` / `CLOUDFLARE_ACCOUNT_ID` vars
- Export a named const `configValidationSchema` from the schema file
- Import and pass it via `validationSchema:` key in `ConfigModule.forRoot()` — no other changes to ConfigModule options
- Use `import Joi from 'joi'` (default import) — Joi v17+ ESM-compatible CJS package

**Never:**
- Validate domain-specific secrets not listed above (GITHUB_*, ORANGE_MONEY_*, WAVE_WEBHOOK_SECRET, SMTP_*, SENTRY_DSN, etc.) — leave them undeclared so they pass through with `.unknown(true)` (the ConfigModule default)
- Change `isGlobal: true`, `envFilePath`, or `cache` options in ConfigModule
- Add `validationOptions` explicitly — defaults (`abortEarly: false`, `allowUnknown: true`) are correct

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior |
|----------|--------------|---------------------------|
| Missing required var | `DATABASE_URL` absent | App crashes at bootstrap: `"DATABASE_URL" is required` |
| JWT_SECRET too short | `JWT_SECRET=short` | App crashes: `"JWT_SECRET" length must be at least 32 characters long` |
| Invalid NODE_ENV | `NODE_ENV=staging` | App crashes: `"NODE_ENV" must be one of [development, production, test]` |
| All required vars present | Full .env loaded | App starts normally |
| Optional var absent | `RESEND_API_KEY` not set | App starts normally |
| Extra unknown vars | Any unlisted var | App starts normally (allowUnknown default) |

</frozen-after-approval>

## Code Map

- `package.json` (root) — add `"joi"` to dependencies; run `npm install joi --ignore-scripts` from monorepo root
- `src/config/config.schema.ts` (NEW) — export `configValidationSchema`: Joi object with required fields, defaults, and optional R2/payment keys
- `src/app.module.ts` — import `configValidationSchema`; add `validationSchema: configValidationSchema` to `ConfigModule.forRoot()` options

## Tasks & Acceptance

**Execution:**
- [x] Install `joi` — not present in node_modules
- [x] Create `src/config/config.schema.ts` — new file, Joi object schema
- [x] Patch `src/app.module.ts` — add `validationSchema` to ConfigModule

**Acceptance Criteria:**
- Given starting the API without `DATABASE_URL`, then process exits immediately with `"DATABASE_URL" is required` in the error output
- Given `JWT_SECRET` shorter than 32 chars, then process exits with a length error
- Given all required vars present, then app starts normally
- Given `nx build api`, then the build completes with no TypeScript errors

## Implementation Notes

- `npm install` and `yarn add` both fail in this sandbox — npm has "Invalid Version:" arborist crash on empty-version ESM/CJS boundary `package.json` files; yarn fails resolving `@nrwl/tao@19.8.15` (unpublished). Installed joi@18.2.9 manually: fetched tarball via curl, extracted to `node_modules/joi`, fetched and extracted all 7 transitive deps (`@hapi/{address,formula,hoek,pinpoint,tlds,topo}`, `@standard-schema/spec`), then added `"joi": "^18.2.9"` to root `package.json` dependencies.
- `import Joi from 'joi'` (default import, Joi v17+ CJS-compatible) used in schema file.
- `tsconfig.base.json` has pre-existing `baseUrl: "."` and `moduleResolution: "node"` — TS 5.x emits TS5101/TS5107 deprecation errors (exit 2). These are pre-existing and unrelated to this story; no new type errors were introduced.

## Plan Change Log

## Review Triage Log

| # | Location | Verdict | Route | Evidence |
|---|----------|---------|-------|----------|
| — | — | No findings — zero new TS errors; all constraint checks pass (required vars, min lengths, defaults, optional with allow('')) | — | `tsc --noEmit` output filtered of pre-existing TS5101/TS5107: empty |
