---
type: spine-review
subject: architecture-afridev-hub-phase1
rubric: good-spine checklist (7 criteria)
verdict: FAIL
reviewer: Claude Sonnet 4.6
date: 2026-10-13
---

# Spine Review — AfriDev Hub Phase 1

## Verdict: FAIL

Three blockers prevent a pass: a direct contradiction on the deployment target, a missing architectural decision for email sending (required by five FRs), and a deferred background-job strategy that leaves three separate modules free to diverge silently. The remaining gaps are not blockers by themselves but reinforce the fail.

---

## Criterion-by-Criterion Assessment

### 1. Fixes the real divergence points for the level below — PARTIAL PASS

The spine correctly forestalls the most dangerous cross-module divergences: module coupling (AD-1/AD-10), ownership of mutations (AD-2), auth fragmentation (AD-3), payment provider fragmentation (AD-4), and response envelope heterogeneity (AD-7). These cover the majority of the cross-feature space.

**Gaps:**

- **Email sending** has no AD. Five FRs require email: FR-4 (confirmation inscription), FR-18 (notification email), FR-32 (alertes hebdomadaires), FR-33 (rappel expiration J50), FR-40 (reçu paiement). Without a decision on provider (Resend, SendGrid, Nodemailer, SES) and a spine rule pinning email dispatch to a single `MailModule`, each of the four modules that need email (auth, notifications, jobs, payments) will independently implement it.

- **GitHub API access** (FR-23) has no AD governing authentication strategy (anonymous vs. authenticated token), rate-limit handling, or failure modes (repo private / rate-limited). The PRD explicitly allows graceful degradation — but without a spine rule, two implementers will produce incompatible fallback behaviours.

- **Currency conversion** (FR-29/FR-30) is not mentioned anywhere in the spine. The PRD raises it as an open question (§9, Q7) and as an assumption (ExchangeRate-API, daily refresh). At feature altitude, the spine should at least decide the module owner or mark it explicitly open.

---

### 2. Every AD's Rule is enforceable and actually prevents its stated divergence — MOSTLY PASS

Most rules are mechanically enforceable via code review or tooling:

- AD-1 (interfaces + EventEmitter2): enforceable by checking NestJS module imports.
- AD-3 (JwtAuthGuard global + @Public()): enforceable; already ADOPTED.
- AD-7 (ResponseInterceptor + AllExceptionsFilter global): enforceable.
- AD-8 (NotificationsModule sole Socket.io consumer): enforceable.
- AD-11 (Joi schema at startup): auto-enforced at runtime.
- AD-12 (nestjs-pino): enforceable by lint rule banning `console.log`.

**Issue in AD-2:** The phrase "lectures cross-module → joins Prisma sur champs publics uniquement" is ambiguous. "Champs publics" is undefined — there is no formal mechanism (e.g., a list, a naming convention, a schema annotation) that tells a developer which fields are "public". The rule cannot be checked mechanically, and the divergence it claims to prevent (N+1 reads, unauthorised cross-module mutation) can still occur via Prisma `include` blocks that go beyond the intended boundary. This is a medium-severity gap, not a blocker by itself, but it needs a concrete definition (e.g., a per-module `PublicFields` type in `libs/shared-types`).

---

### 3. Nothing under Deferred could let two units diverge silently — FAIL

The deferred section contains one silent-divergence risk that the spine itself acknowledges but does not contain:

> "Queue de jobs background (BullMQ) pour email alerts (FR-32), expiration offres (FR-33), reçus (FR-40) — implémentation déléguée ; pas un invariant spine"

Three separate modules — `jobs/`, `payments/`, and `notifications/` — all need background processing. Labelling this "pas un invariant spine" without a minimum constraint means each module can independently pick `setTimeout`, `node-cron`, a custom in-process scheduler, or BullMQ. These choices have operational consequences (persistence across restarts, observability, retry semantics) that are impossible to reconcile after the fact. The spine should either:

(a) name a shared `BackgroundJobsModule` wrapping BullMQ (or node-cron as a Phase 1 placeholder) and route FR-32/FR-33/FR-40 through it, or  
(b) explicitly forbid inline timers in domain modules and defer the shared module to Phase 2 with a clear interface contract.

As written, the deferred section lets three units diverge silently on a cross-cutting operational concern.

---

### 4. Named tech is verified-current — PASS

All versions are plausible and non-obsolete as of October 2026:

| Package | Stated version | Assessment |
|---|---|---|
| NestJS | 10.4.x | Current stable line |
| TypeScript | 5.5.x | Current |
| Prisma | 5.20.x | Current 5.x line |
| PostgreSQL | 16 | Current LTS |
| Socket.io | 4.8.x | Current |
| ioredis | 5.4.x | Current |
| nestjs-pino | ^4.x | Current |
| Passport.js | 0.7.x | Current |
| @nestjs/jwt | 10.2.x | Consistent with NestJS 10 |
| Angular | 18 (structural seed) | Plausible |

No obsolete or replaced tech detected.

---

### 5. Ratifies rather than contradicts brownfield codebase conventions — PASS WITH ONE CAVEAT

The spine aligns well with `AGENTS.md` and `CLAUDE.md`:

- "All database access through injected PrismaService" → implied by AD-2 and structural seed.
- "Redis access through injected RedisService" → implied by AD-5 and `redis/` module in structural seed.
- "Monetary amounts as integer cents, never floats" → explicitly in Consistency Conventions.
- "JWT guard global, @Public() for public routes" → AD-3 is marked [ADOPTED], ratifying the existing convention.
- "WebSocket gateway in notifications/" → AD-8 explicitly designates `NotificationsGateway`.

**Caveat:** `AGENTS.md` line "Never instantiate PrismaClient directly" is not ratified by an AD. It is implied but not enforced by the spine. This is low severity since AD-2 routes all mutations through the module owner, but an explicit note in AD-2 or the Consistency Conventions table would close the gap.

---

### 6. Covers the spec's capabilities (FR-1 to FR-40) — PARTIAL PASS

The frontmatter `binds` field lists all 40 FRs, but the Capability Map covers only FR-4 to FR-40. FR-1 to FR-3 (Infra + CI/CD + Design system) are in scope per the frontmatter but have zero coverage in any AD, the capability map, or the deferred section (FR-2 gets a single dismissive line: "pas un invariant architectural").

Consequences:
- FR-1 (Docker Compose local stack): no AD says where the Compose definition lives, who owns it, or how dev/prod parity is maintained.
- FR-2 (GitHub Actions CI/CD pipeline): deferred without guidance. The pipeline is where `DATABASE_URL`, `REDIS_URL`, and Systalink deploy secrets are wired. Their absence from the spine means each developer who touches CI will make independent decisions about secret management, deploy workflow, and environment promotion.
- FR-3 (Design system — Tailwind + shadcn/ui): This is a frontend concern, but the spine says its scope is "backend NestJS". FR-3 is legitimately out of scope for this backend spine, yet it appears in `binds`. The `binds` list should either remove FR-1/FR-3 (backend-irrelevant) or add a brief ratification clause.

Also missing from the capability map:
- **FR-30 (multi-currency display)**: currency conversion logic has no module owner assigned.
- **FR-34 (plan recruteur premium)**: subscription payment flow is not mapped. FR-34 is assumed to use `PaymentProvider` (PRD §10), but the spine doesn't confirm this mapping explicitly.

---

### 7. Operational/environmental envelope is decided, deferred, or an open question — FAIL

This is the most significant structural gap.

**Direct contradiction — CRITICAL:**
AD-9 targets **Systalink** as the deployment platform. The PRD targets **VPS OVH** (NFR-8: "VPS OVH mono-instance Phase 1", NFR-9: "PM2 ou équivalent sur VPS", FR-2: "déploiement automatique sur le VPS OVH"). A developer reading the PRD will configure a GitHub Actions workflow deploying to OVH; a developer reading the spine will configure for Systalink. These are incompatible deployment targets. The spine must explicitly state that Systalink supersedes the PRD's OVH mention, and update or annotate FR-2 accordingly.

**Undecided dimensions with no deferred marker:**

| Dimension | Status in spine | Required FR |
|---|---|---|
| Process manager (PM2 vs. systemd vs. other) | Absent | NFR-9 |
| Monitoring / error tracking (Sentry, Logtail, etc.) | Absent | NFR-10 |
| HTTPS / SSL termination (Cloudflare, Systalink native, nginx) | Absent | NFR-5 |
| Environment promotion (dev → staging → prod) | Absent | FR-2, NFR-8 |
| Email sending provider | Absent | FR-4, FR-18, FR-32, FR-33, FR-40 |

None of these appear in the ADs, the Deferred section, or as open questions. They are simply absent. At feature altitude, each must be either decided (AD), explicitly deferred with a safe interface, or flagged as an open question with an owner.

---

## Consolidated Findings

### Finding 1 — CRITICAL
**Category:** correctness  
**Location:** AD-9  
**Description:** AD-9 names Systalink as deployment platform; PRD NFR-8, NFR-9, and FR-2 name VPS OVH. Teams will provision incompatible infrastructure. One must be authoritative; the spine must say which and annotate FR-2.

### Finding 2 — HIGH
**Category:** completeness  
**Location:** Capability map, Deferred section  
**Description:** Email sending (MailModule + provider) has no AD, no module owner, and no deferred marker. Five FRs (FR-4, FR-18, FR-32, FR-33, FR-40) across three domain modules require it; without a spine rule all three will implement email independently.

### Finding 3 — HIGH
**Category:** divergence-risk  
**Location:** Deferred — "Queue de jobs background (BullMQ)"  
**Description:** Background job processing is deferred as "pas un invariant spine" without a minimum interface contract. The `jobs/`, `payments/`, and `notifications/` modules will independently implement timers or queues with incompatible persistence and retry semantics.

### Finding 4 — HIGH
**Category:** completeness  
**Location:** Capability map, frontmatter `binds`  
**Description:** FR-1 and FR-2 appear in `binds` but have no coverage in any AD or the capability map. FR-2 (CI/CD) requires decisions about secret management, deploy workflow, and environment promotion that are currently undecided and undeferred.

### Finding 5 — MEDIUM
**Category:** completeness  
**Location:** AD-9, missing ADs  
**Description:** Key operational envelope dimensions — process manager (PM2), monitoring provider, HTTPS/SSL termination, and environment definitions — are neither decided, deferred, nor marked as open questions. The operational envelope is structurally incomplete for a feature-altitude spine.

---

## Required Changes Before Re-Review

1. **Resolve deployment contradiction**: Add a note to AD-9 stating Systalink is the Phase 1 deployment target and that PRD NFR-8/NFR-9/FR-2's "VPS OVH" references are superseded by this decision. Update FR-2 in the capability map accordingly.

2. **Add AD-13 — Email Service**: Name the email provider (e.g., Resend, SendGrid, Nodemailer+SMTP), designate a `MailModule` in the structural seed as the sole email dispatcher, and mandate that all domain modules emit `EventEmitter2` events rather than calling SMTP directly. Map FR-4, FR-18, FR-32, FR-33, FR-40 to this AD in the capability map.

3. **Add an AD or deferred contract for background jobs**: Either designate a shared `BackgroundJobsModule` (BullMQ or node-cron) that all domain modules use, or explicitly forbid inline timers in domain services and defer the shared module with a typed interface (`IBackgroundJobService`) that domain modules can call.

4. **Extend the capability map to cover FR-1, FR-2, FR-30, FR-34**: Either add rows or move FR-1/FR-3 out of `binds` with an explicit note that they are frontend / infra concerns outside backend spine scope.

5. **Decide or defer process manager, monitoring, and HTTPS**: Add one sentence per item to AD-9 or create a new AD-13+ for operational defaults (PM2, Sentry/Logtail, Cloudflare SSL termination), or add them to Deferred with an owner.

---

## What the Spine Gets Right

The spine is structurally sound in its core — the NestJS modular monolith paradigm with EventEmitter2 for side-effects is the right call for Phase 1, and ADs 1/3/4/7/8/10/11/12 are well-formed, enforceable, and correctly targeted. The Consistency Conventions table is thorough and immediately usable. The PaymentProvider abstraction (AD-4) is a strong pattern that will survive provider additions cleanly. The presigned URL flow (AD-6) is correct for 3G network conditions. The in-memory Socket.io map with an explicit Phase 2 Redis adapter path (AD-8) is an honest and practical tradeoff.

These strengths mean the spine is one targeted revision away from a pass.
