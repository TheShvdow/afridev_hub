---
title: 'Refactor sweep — E1'
type: 'feature'
ticket: '6'
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

**Problem:** Review findings reported in the plans of stories 1.2–1.5 may require fixes: naming, unused imports, residual `any` types, guard/decorator consistency. Story 1.1 (health-check) had two review findings (type annotation mismatch and double-invocation in spec tests).

**Approach:** Collect all findings from plan files of stories 1–5. Apply any outstanding fixes. Run tsc to confirm zero new TypeScript errors. No new behavior introduced.

## Boundaries & Constraints

**Always:**
- Apply exactly the findings listed in plan Review Triage Logs — no scope creep
- No new behavior or features
- No changes to tests beyond fixes called out in review findings
- TypeScript errors after filtering pre-existing TS5101/TS5107/TS2688: zero

**Never:**
- Add new functionality
- Modify schema, interfaces, or contracts beyond what findings specify

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior |
|----------|--------------|---------------------------|
| `tsc -p apps/api/tsconfig.app.json --noEmit` | After all fixes | Zero new errors (pre-existing TS5101/TS5107/TS2688 filtered) |
| health.controller.spec.ts type annotation | `jest.Mocked<HealthService>` | Already applied in story 1.1 implementation |
| health.controller.spec.ts double invocation | `const rejection = controller.check()` | Already applied in story 1.1 implementation |

</frozen-after-approval>

## Code Map

**No changes required** — all findings were either already applied during story implementation or no findings were reported.

- `apps/api/src/health/health.controller.spec.ts` — story 1.1 findings #1 and #3 already applied (verified by reading current file)

## Tasks & Acceptance

**Execution:**
- [x] Read Review Triage Log from story-structured-logging-nestjs-pino-plan.md — no findings
- [x] Read Review Triage Log from story-config-validation-joi-plan.md — no findings
- [x] Read Review Triage Log from story-mail-module-resend-plan.md — no findings
- [x] Read Review Triage Log from story-health-check-probe-db-redis-plan.md — 3 entries: #1 (medium, already applied), #2 (rejected false positive), #3 (low, already applied)
- [x] Read Review Triage Log from story-storybook-design-system-plan.md — no findings
- [x] Manual scan: `any` types in E1 files — zero (only pre-existing `(this as any).$on` in prisma.service.ts, not E1 work)
- [x] Manual scan: `console.log` in E1 scope — zero (replaced by pino logger in story 1.2)
- [x] Manual scan: unused imports in health/mail/config/app.module.ts/main.ts — zero
- [x] Manual scan: naming consistency — consistent; exported symbols match their filenames throughout
- [x] Manual scan: guard/decorator consistency — `@Controller('health')` intentionally has no JWT guard (health check is public by design, per story 1.1 constraints)
- [x] `tsc -p apps/api/tsconfig.app.json --noEmit` (via node .../.ignored/typescript/bin/tsc) — zero new errors after filtering TS5101/TS5107/TS2688

**Acceptance Criteria:**
- Given all Review Triage Logs from stories 1–5, then all findings are applied or documented as rejected
- Given `tsc -p apps/api/tsconfig.app.json --noEmit`, then zero new TypeScript errors (filtering pre-existing deprecations)
- Given manual code scan of all E1 modules (health, mail, config, logging, app.module, main.ts), then zero `any` types, unused imports, or `console.log` in E1 scope

## Implementation Notes

- Both health-check findings were already in the committed state of `health.controller.spec.ts`:
  - Finding #1 (medium): line 8 already reads `jest.Mocked<HealthService>`; line 26 already has `as jest.Mocked<HealthService>` cast.
  - Finding #3 (low): all three 503 test blocks already use shared `const rejection = controller.check()` reference (lines 51, 68, 85).
- ESLint and `nx` are broken in this sandbox (dependencies in `.ignored/`); the same pattern held for all prior stories. The equivalent checks (TS type correctness, no `console.log`, no `any` types, no unused imports) were performed via `tsc --noEmit` + targeted `grep` scans.
- `mail.service.ts` uses `process.env['NODE_ENV']` directly (rather than `ConfigService`) for the sandbox guard — this is an intentional optimization to avoid async DI overhead at startup and is consistent with the story 1.4 I/O matrix.

## Plan Change Log

## Review Triage Log

| # | Location | Verdict | Route | Evidence |
|---|----------|---------|-------|----------|
| — | — | No findings — all story 1–5 findings already applied; manual scan of E1 files shows zero new issues | — | `tsc --noEmit` on tsconfig.app.json filtered of pre-existing TS5101/TS5107/TS2688: empty output |
