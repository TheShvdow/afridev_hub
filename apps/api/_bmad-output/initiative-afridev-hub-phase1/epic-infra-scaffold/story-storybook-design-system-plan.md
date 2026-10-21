---
title: 'Storybook — design system libs/ui'
type: 'feature'
ticket: '5'
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

**Problem:** `libs/ui` components use hardcoded `orange-500` Tailwind classes that contradict the design token system (`--color-primary-500: #4CAF50` — green). Storybook has no setup to showcase components with the dark theme.

**Approach:** Install Storybook 8 (`@storybook/angular`) via manual tarball (package managers broken in sandbox). Fix `orange-500` → CSS custom-property arbitrary values in Button, Input, Card. Create `.storybook/main.ts` + `.storybook/preview.ts` (imports `apps/web/src/styles.scss` for tokens). Write stories for Button (11 stories: all 5 variants + 4 sizes + loading/disabled/fullWidth), Input (7 stories), Card (6 stories). Add `ui:storybook` and `ui:build-storybook` nx targets in `project.json`. Create `tsconfig.storybook.json` for type checking.

## Boundaries & Constraints

**Always:**
- Storybook 8.x (`@storybook/angular@8.3.7`)
- Design tokens sourced from `apps/web/src/styles.scss` via `preview.ts` import
- `--color-primary-500` (#4CAF50, green) — never orange
- All `orange-*` Tailwind classes replaced with `[var(--color-primary-*)]` arbitrary values
- `tsconfig.storybook.json` extends `./tsconfig.json`; only story files + `.storybook/*.ts` in `include`
- `nx targets`: `ui:storybook` and `ui:build-storybook` in `libs/ui/project.json`

**Never:**
- Install `@storybook/nx-angular` or any Nx-specific Storybook preset (not in node_modules)
- Run `nx g @storybook/nx-angular:configuration` — package managers broken
- Add stories to `tsconfig.lib.json` or `tsconfig.lib.prod.json` — stories are dev-only

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior |
|----------|--------------|---------------------------|
| Button primary variant | `variant="primary"` | Uses `bg-[var(--color-primary-500)]` (green) |
| Input focus ring | Normal state | `focus:ring-[var(--color-primary-500)]` |
| Card hover shadow | `hoverable=true` | `color-mix(in_srgb, var(--color-primary-900) 20%, transparent)` |
| tsc storybook | `tsc -p tsconfig.storybook.json --noEmit` | Only pre-existing TS5101/TS5107 deprecations; zero new errors |

</frozen-after-approval>

## Code Map

- `libs/ui/.storybook/main.ts` (NEW) — Storybook 8 config, `@storybook/angular` framework
- `libs/ui/.storybook/preview.ts` (NEW) — imports `apps/web/src/styles.scss`; dark background default
- `libs/ui/tsconfig.storybook.json` (NEW) — TypeScript config for story files
- `libs/ui/src/lib/button/button.component.ts` — replaced all `orange-500` variants with CSS token arbitrary values
- `libs/ui/src/lib/input/input.component.ts` — replaced `text-orange-500`, `focus:ring-orange-500`, `focus:border-orange-500`
- `libs/ui/src/lib/card/card.component.ts` — replaced `hover:shadow-orange-900/20` with `color-mix()` token
- `libs/ui/src/lib/button/button.stories.ts` (NEW) — 11 stories (5 variants, 4 sizes, loading, disabled, fullWidth)
- `libs/ui/src/lib/input/input.stories.ts` (NEW) — 7 stories (default, hint, error, required, prefixIcon, suffixIcon, disabled)
- `libs/ui/src/lib/card/card.stories.ts` (NEW) — 6 stories (default, withFooter, hoverable, noPadding, large, noBorder)
- `libs/ui/project.json` — added `storybook` and `build-storybook` nx targets
- `package.json` (root) — added `storybook@^8.3.7`, `@storybook/angular@^8.3.7`, `@storybook/core@^8.3.7`, `@storybook/csf@^0.1.12` as devDependencies

## Tasks & Acceptance

**Execution:**
- [x] Install storybook packages via manual tarball (storybook@8.3.7, @storybook/angular@8.3.7, @storybook/core@8.3.7, @storybook/csf@0.1.12)
- [x] Create stub `node_modules/storybook/internal/types/index.d.ts` and `node_modules/@storybook/core/types/index.d.ts` for `moduleResolution: "node"` compatibility
- [x] Fix `button.component.ts` — orange-500 → CSS token arbitrary values
- [x] Fix `input.component.ts` — orange-500 → CSS token arbitrary values
- [x] Fix `card.component.ts` — orange-900/20 → color-mix CSS token
- [x] Create `libs/ui/.storybook/main.ts`
- [x] Create `libs/ui/.storybook/preview.ts`
- [x] Create `libs/ui/tsconfig.storybook.json`
- [x] Create `button.stories.ts`, `input.stories.ts`, `card.stories.ts`
- [x] Patch `libs/ui/project.json` — add `storybook` and `build-storybook` targets
- [x] Update root `package.json` devDependencies

**Acceptance Criteria:**
- Given `tsc -p libs/ui/tsconfig.storybook.json --noEmit`, then zero new TypeScript errors (only pre-existing TS5101/TS5107 deprecations)
- Given `tsc -p libs/ui/tsconfig.lib.json --noEmit`, then no regressions from orange→token refactor
- Given `libs/ui/project.json`, then `storybook` and `build-storybook` targets are present
- Given no `MAIL_FROM_ADDRESS` / orange classes in button/input/card, then components use `--color-primary-500` token

## Implementation Notes

- Both `npm install` and `yarn add` are broken in this sandbox (same arborist/registry issues as stories 3 and 4). Installed 4 packages via manual tarball: downloaded from registry.npmjs.org, extracted to `node_modules/`, updated root `package.json`.
- `moduleResolution: "node"` (from `tsconfig.base.json`) does not read `package.json` `exports` maps. Storybook 8 uses sub-path exports (`storybook/internal/types`, `@storybook/core/types`) without physical directory stubs. Created two stub `index.d.ts` files that re-export through the physical paths: `storybook/internal/types/index.d.ts` → `../../core/types` → `@storybook/core/types` → `../dist/types`.
- `skipLibCheck: true` in `tsconfig.base.json` suppresses errors inside `node_modules/**/*.d.ts` (e.g., the `react` import in `@storybook/core/dist/types/index.d.ts`), so only our story files are type-checked.
- `tsc --noEmit` filtered of pre-existing TS5101/TS5107 lines: empty output (same pattern as stories 2–4).

## Plan Change Log

## Review Triage Log

| # | Location | Verdict | Route | Evidence |
|---|----------|---------|-------|----------|
| — | — | No findings — zero new TS errors in both `tsconfig.storybook.json` and `tsconfig.lib.json`; all orange-500 tokens replaced; `.storybook/` config present; `project.json` has storybook targets | — | `tsc --noEmit` filtered of pre-existing TS5101/TS5107: empty output |
