---
title: PRD ↔ Architecture Spine — Reconciliation Review
scope: FR-1 to FR-40 (Phase 1)
verdict: FAIL
reviewer: bmad-reconcile-agent
date: 2026-10-13
sources:
  - prd: apps/api/_bmad-output/prd-afridev-hub/prd-afridev-hub.md (FR-1–FR-40)
  - spine: apps/api/_bmad-output/architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md
---

# PRD ↔ Architecture Spine — Reconciliation Review

## Verdict: FAIL

The spine correctly assigns all 40 Phase 1 FRs to modules and establishes sound invariants for data ownership, payment abstraction, real-time notifications, upload patterns, and inter-module communication. However, four medium-to-high gaps from the PRD did not land in any AD, convention, or module note. These gaps are architectural (not implementation-level choices) and will produce rework if not resolved before story writing.

---

## Top Gaps

### GAP-1 — Email delivery system not architecturally defined (HIGH)
**Affects:** FR-18 (email notification < 5 min), FR-32 (weekly job alert emails), FR-33 (J50 offer expiry reminder), FR-40 (payment receipt email)

The spine defers BullMQ as "pas un invariant spine" without naming an email provider, a transactional email module, or an email template pattern. This is not an implementation detail — it is an architectural decision that affects:
- Which module owns email sending (notifications/ only, or each domain module sends its own mails?)
- Whether a shared `MailModule` wraps the provider (Resend, SendGrid, SMTP via Nodemailer)
- Whether BullMQ or a lighter alternative (NestJS `@nestjs/schedule` + cron) handles scheduled emails (FR-32, FR-33)

FR-40 requires receipts on confirmed payments; FR-18 requires email within 5 min of forum events. Both are Phase 1. Without an AD for the email layer, two teams will implement it differently.

**Recommended fix:** Add AD-13 declaring the email provider, the single MailModule pattern (owned by notifications/ or a dedicated mail/ module), and the job-queue strategy for scheduled emails.

---

### GAP-2 — Exchange rate service absent (MEDIUM)
**Affects:** FR-29 (salary filter with currency conversion), FR-30 (salaries displayed in member's preferred currency)

FR-29 states `[ASSUMPTION: taux de change récupéré quotidiennement depuis une API publique]`. FR-30 requires salaries displayed in the member's preferred currency. This implies:
- A daily cron task calling an external exchange rate API (ExchangeRate-API or equivalent)
- Results cached in Redis with a defined TTL and stale-fallback behavior
- A lightweight CurrencyService (injected by jobs/) providing `convert(amount, from, to)`

None of this appears in any AD or module note. The spine lists Redis stores (AD-5) but only for JWT whitelist, rate limiting, and full-text cache — exchange rates are absent. FR-29's question (§9 Q7: which provider, what frequency, stale cache behavior) is open in the PRD and unaddressed in the spine.

**Recommended fix:** Add a currency module or service note to AD-5 (or a new AD) specifying the store key pattern, TTL, refresh cron, and fallback behavior.

---

### GAP-3 — Reputation-gated authorization pattern not modeled (MEDIUM)
**Affects:** FR-16 (vote requires Reputation ≥ 10)

AD-3 models authorization with two layers: `JwtAuthGuard` (global) and `@Roles()` + `RolesGuard` for ADMIN/MODERATOR routes. FR-16 requires a third pattern: data-dependent guard — "vote allowed only if caller's Reputation ≥ 10." This is not a role; it is a runtime property of the User entity.

The spine is silent on this pattern. Without an AD note, developers will either:
1. Add reputation checks ad-hoc in each service (scattered, untestable), or
2. Create a `ReputationGuard` that loads the user's score on every guarded request (N+1 risk).

The correct pattern (check reputation in the service layer, throw `ForbiddenException` with typed error code `VOTES_MEMBER_INSUFFICIENT_REPUTATION`) should be stated as an architectural convention.

**Recommended fix:** Extend AD-3 with a third authorization tier: "data-dependent checks (reputation, ownership) → service layer only, never a decorator/guard."

---

### GAP-4 — Job offer pre-publication validation flow not mapped (MEDIUM)
**Affects:** FR-28 ("Offre soumise à validation manuelle légère (anti-spam) avant publication")

The moderation/ module exists for FR-20/FR-21 (forum signalements). FR-28 requires a distinct pre-publication moderation flow for job offers: offers are submitted in `PENDING` status and must be approved before becoming visible. The spine's Capability Map shows jobs/ bound to AD-2, AD-7, AD-10 — no moderation coupling, no status machine noted.

This isn't covered by forum moderation (post-publication signalement). It needs either:
- A `JobStatus` enum (`PENDING | PUBLISHED | EXPIRED | REJECTED`) with a review action in the admin or moderation module, or
- A note that jobs/ emits a `jobs.offer.submitted` event consumed by moderation/

Without this, jobs/ will be built as direct-publish, requiring a rework when the moderation requirement surfaces.

**Recommended fix:** Add a status-machine note to the jobs/ entry in the Capability Map and specify whether moderation/ or a dedicated admin/ route handles offer approval.

---

### GAP-5 — NFR security constraints not captured (LOW)
**Affects:** NFR-7 (bcrypt cost ≥ 12), NFR-6 (rate limiting 100 req/min on login, register, search)

Two PRD non-functional constraints in the security section dropped silently:
- **NFR-7**: bcrypt cost ≥ 12. The spine mentions Passport.js in the stack but sets no bcrypt cost floor. A developer choosing cost 10 (common default) would be spec-compliant by the spine but non-compliant against the PRD.
- **NFR-6**: Rate limiting on three specific endpoints (login, inscription, recherche) at 100 req/min/IP. AD-5 says Redis is the store and values are "delegated to implementation." The PRD's 100 req/min is not a suggestion — it is a testable requirement.

**Recommended fix:** Add both constraints to Consistency Conventions table or to AD-3/AD-5 with explicit values.

---

## FR Coverage Table

| FR | Module in Spine | Gap |
|----|----------------|-----|
| FR-1 Monorepo Nx | Structural Seed / AD-9 | Docker Compose local setup not called out (AD-9 focuses on Systalink prod) |
| FR-2 CI/CD | Deferred (explicit) | OK — acknowledged as implementation choice |
| FR-3 Design system | Out of scope (frontend) | OK — spine is backend only |
| FR-4 Email registration | auth/ | bcrypt cost floor missing (GAP-5) |
| FR-5 OAuth GitHub | auth/ (Passport.js) | OK |
| FR-6 OAuth Google | auth/ (Passport.js) | OK |
| FR-7 Onboarding | auth/ + users/ | OK |
| FR-8 Public profile | users/ | SSR/OG tags are frontend; backend data contract OK |
| FR-9 Profile edit | users/ | OK |
| FR-10 Verified badge | users/ | Auto-revocation event trigger not noted — minor |
| FR-11 Reputation real-time | gamification/ + notifications/ | OK (AD-1 events, AD-8 WS) |
| FR-12 Question creation | forum/ | OK |
| FR-13 Markdown preview | Frontend | OK — spine is backend |
| FR-14 Duplicate detection | forum/ | Min-similarity 0.6 not constrained — minor |
| FR-15 Answers | forum/ | OK |
| FR-16 Votes | votes/ | Reputation-gate pattern missing (GAP-3) |
| FR-17 Accepted answer | forum/ | OK |
| FR-18 Notifications | notifications/ (WS) | Email leg undefined architecturally (GAP-1) |
| FR-19 Full-text search | forum/ + Redis | French accent support not noted — minor |
| FR-20 Signalement | moderation/ | OK |
| FR-21 Moderation queue | moderation/ | Audit journal not noted — minor |
| FR-22 Project submission | projects/ | OK |
| FR-23 GitHub auto-import | projects/ | OK (async, failure handled) |
| FR-24 Project page | projects/ | OK |
| FR-25 Stars | projects/ | OK |
| FR-26 Showcase filters | projects/ | Shareable URL is frontend — OK |
| FR-27 Anti-spam | projects/ | OK |
| FR-28 Job posting | jobs/ | Pre-publication validation not mapped (GAP-4) |
| FR-29 Candidate filters | jobs/ | Exchange rate service missing (GAP-2) |
| FR-30 Multi-currency | jobs/ | Exchange rate service missing (GAP-2) |
| FR-31 Direct application | jobs/ | AD-6 presigned URL covers R2 — OK |
| FR-32 Email alerts | jobs/ | Email + queue architecture missing (GAP-1) |
| FR-33 Auto-expiration | jobs/ | BullMQ deferred, no email sender defined (GAP-1) |
| FR-34 Premium recruiter plan | jobs/ | Subscription billing pattern not specified — minor |
| FR-35 PaymentProvider interface | payments/ (AD-4) | OK |
| FR-36 Wave integration | payments/ (AD-4) | OK |
| FR-37 Orange Money | payments/ (AD-4) | OK (Phase 1 conditional) |
| FR-38 Stripe fallback | payments/ (AD-4) | OK |
| FR-39 Idempotent webhooks | payments/ (AD-5 PostgreSQL) | OK |
| FR-40 Receipt email | payments/ | Email delivery undefined (GAP-1) |

---

## Quiet Requirements Dropped (Non-Functional / Tone)

These are cross-cutting constraints from §7 of the PRD that are not visible in any AD, not because they were deferred, but because they were not evaluated:

| Constraint | PRD ref | Status in spine |
|------------|---------|-----------------|
| bcrypt cost ≥ 12 | NFR-7 | Absent (GAP-5) |
| Rate limiting 100 req/min on login / register / search | NFR-6 | "Delegated" without values (GAP-5) |
| Uptime 99.5% / zero-downtime deploy via PM2 | NFR-8, NFR-9 | AD-9 mentions Systalink but not PM2 or uptime SLA |
| WCAG 2.1 AA on critical paths | NFR-12 | Frontend — acceptable to omit from backend spine |
| API responses < 200ms p95 (Redis cache) | NFR-1 | Mentioned for full-text only; no general caching AD |
| French-first error messages and email templates | §2 Vision, §5 Non-Goals | Absent — minor but affects MailModule design |

---

## Required Actions Before Story Writing

1. **Add AD-13** — Email delivery: provider choice (Resend / Nodemailer), MailModule ownership, queue strategy for scheduled/async emails (FR-18 email, FR-32, FR-33, FR-40).
2. **Add currency note to AD-5** — CurrencyService, Redis cache key, TTL, daily refresh cron, stale fallback (FR-29, FR-30).
3. **Extend AD-3** — Third authorization tier: "data-dependent checks go in service layer, never a guard" with the reputation-gate as the canonical example (FR-16).
4. **Update Capability Map** — Add JobStatus state machine and moderation coupling note to jobs/ entry (FR-28).
5. **Add to Consistency Conventions** — bcrypt cost ≥ 12 (NFR-7); rate limiting values 100 req/min with endpoint list (NFR-6).
