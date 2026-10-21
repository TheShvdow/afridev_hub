---
title: 'MailModule — Resend adapter'
type: 'feature'
ticket: '4'
created: '2026-10-13'
status: done
baseline_revision: 'NO_VCS'
route: 'oneshot'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Domain modules (auth, notifications) will need to send transactional emails but there is no mail abstraction layer. Directly calling Resend SDK in domain modules would scatter the API key and from-address logic everywhere.

**Approach:** Create `src/mail/` with `MailModule` (global, registered in AppModule) and `MailService`. The service reads `RESEND_API_KEY` and `MAIL_FROM_ADDRESS` from `ConfigService`. In sandbox mode (`NODE_ENV !== 'production'`), it logs instead of making network calls — CI runs with `NODE_ENV=test` so no real key is required. In production, it POSTs to the Resend REST API endpoint using Node 18's built-in `fetch` (no extra package).

## Boundaries & Constraints

**Always:**
- `MailModule` decorated with `@Global()` — domain modules get `MailService` without re-importing
- `MailService.send(to: string, subject: string, html: string): Promise<void>` public API
- Sandbox mode: `NODE_ENV !== 'production'` — log `{ to, subject, html }` via `PinoLogger`, return immediately
- Production mode: POST to `https://api.resend.com/emails` with `Authorization: Bearer <RESEND_API_KEY>`
- `MAIL_FROM_ADDRESS` from ConfigService; fallback default: `'noreply@afridevhub.com'`
- Use `@InjectPinoLogger(MailService.name)` / `PinoLogger` for all logging (consistent with PrismaService/RedisService pattern)
- `AppModule` imports `MailModule`

**Never:**
- Install the `resend` npm package — use native `fetch` (Node 18+) to avoid broken package managers
- Add `MAIL_FROM_ADDRESS` to `config.schema.ts` — it was not in the E1 scope for Joi validation; let it pass through as unknown
- Add `MAIL_FROM_ADDRESS` as required in ConfigModule — it has a sensible default
- Throw on sandbox send failure — log a warning and resolve

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior |
|----------|--------------|---------------------------|
| Sandbox send | `NODE_ENV=test`, `send(to, subject, html)` | `logger.info({ to, subject }, 'Mail (sandbox): skipped send')` — no HTTP call |
| Production send | `NODE_ENV=production`, valid key | POST to `https://api.resend.com/emails`, resolve on 2xx |
| Production send error | 4xx/5xx from Resend | Throw with message including status code |
| Missing RESEND_API_KEY in prod | Not set | ConfigService returns undefined; POST auth header empty; Resend returns 401; throw |
| `MAIL_FROM_ADDRESS` not set | Not in env | Falls back to `'noreply@afridevhub.com'` |

</frozen-after-approval>

## Code Map

- `src/mail/mail.module.ts` (NEW) — `@Global()` module declaring/exporting `MailService`
- `src/mail/mail.service.ts` (NEW) — `MailService` with `send()`, sandbox vs production logic, PinoLogger injection
- `src/app.module.ts` — add `import { MailModule }` and `MailModule` to imports array

## Tasks & Acceptance

**Execution:**
- [x] Create `src/mail/mail.module.ts` — `@Global()` module
- [x] Create `src/mail/mail.service.ts` — `MailService` with sandbox/production send
- [x] Patch `src/app.module.ts` — import and register `MailModule`

**Acceptance Criteria:**
- Given `NODE_ENV=test`, when `send(to, subject, html)` is called, then no HTTP call is made and a structured log line is emitted
- Given `NODE_ENV=production` with a valid key, when `send()` is called, then a POST is made to `https://api.resend.com/emails` with the correct payload
- Given `nx build api` (or `tsc --noEmit`), then the build completes with no TypeScript errors
- Given no `MAIL_FROM_ADDRESS` env var, then the service uses `'noreply@afridevhub.com'` as sender

## Implementation Notes

- Used Node 18's built-in `fetch` for Resend REST API calls — avoids installing the `resend` npm package. Both npm (arborist "Invalid Version:" crash) and yarn/pnpm (`@nrwl/tao@19.8.15` not on registry) are broken in this sandbox, making any package installation require tedious manual tarball work.
- `MAIL_FROM_ADDRESS` is NOT added to `config.schema.ts` per the story constraint; it passes through `@nestjs/config`'s default `allowUnknown: true` behaviour and falls back to `'noreply@afridevhub.com'` in the service constructor.
- `tsc --noEmit` filtered of pre-existing TS5101/TS5107 deprecation lines: empty output (grep exit 1 = no unfiltered lines = zero new type errors).

## Plan Change Log

## Review Triage Log

| # | Location | Verdict | Route | Evidence |
|---|----------|---------|-------|----------|
| — | — | No findings — zero new TS errors; all constraints satisfied (Global module, PinoLogger injection, native fetch, sandbox mode logs without HTTP, production throws on non-2xx) | — | `tsc --noEmit` output filtered of pre-existing TS5101/TS5107: empty |
