# Adversarial Architecture Review — AfriDev Hub Phase 1

**Reviewer role:** adversarial  
**Date:** 2026-10-13  
**Target:** `architecture-afridev-hub-phase1.md` (AD-1 through AD-12)  
**Scope:** NestJS 10 Modular Monolith, 10 domain modules, FR-1–FR-40  
**Method:** construct two module implementations each obeying every AD, then show they build incompatibly

---

## Verdict: FAIL

Five incompatible pairs were found. Two are critical. The spine's ADs are necessary but not sufficient constraints — they leave ownership boundaries, event contracts, and mutation paths ambiguous enough that two compliant implementations can silently break each other.

---

## Incompatible Pairs

### Pair 1 — `users` ↔ `gamification` : Dual ownership of `User.reputationScore`

**Severity: CRITICAL**

**The trap in the spine:**  
The Capability Map assigns "profils, réputation, badge vérifié" to `auth/, users/` (FR-4–FR-10) AND "Score de réputation" to `gamification/` (FR-11). The word "réputation" appears in both module descriptions with no demarcation of which field, table, or Prisma model each owns.

**Module A — `users` (compliant):**  
AD-2 states "Mutations d'une entité → module owner exclusivement." The capability map lists `users/` as the home for "profils, réputation". A `users` developer adds `reputationScore Int @default(0)` to the Prisma `User` model and exposes `UsersService.incrementReputation(userId, delta)` via the `IUsersService` interface. When `forum.question.created` fires, `users` listens and bumps the score. No AD is violated: `users` owns User, mutations go through the owner, cross-module comms use EventEmitter2.

**Module B — `gamification` (compliant):**  
AD-2 + the capability map entry "FR-11 Score de réputation → gamification/" lead a `gamification` developer to conclude they own reputation scoring. They listen to `votes.question.voted`, `forum.answer.accepted`, etc., and write directly to `User.reputationScore` via `PrismaService` (which every module can import per AD-10 — only domain module imports are banned, not infra). They expose `IGamificationService.getScore(userId)` by querying the same field. No AD is violated: they believe they are the owner, and PrismaModule is infrastructure freely importable.

**Incompatibility:**  
Both modules write to `User.reputationScore` independently. There is no transaction boundary across EventEmitter2 handlers. A single forum post triggers two increments from two separate handlers. The final score is double-counted. No compilation error, no runtime error, no AD violation apparent to either author.

**ADs this slips through:**  
AD-2 (no single authoritative owner named), AD-1 (event subscription overlap undetected), AD-10 (PrismaModule importable by all makes direct table access unrestricted)

---

### Pair 2 — `forum` ↔ `moderation` : Incompatible mutation path for content status

**Severity: CRITICAL**

**The trap in the spine:**  
AD-1 permits BOTH synchronous cross-module calls via injected interfaces AND async EventEmitter2 events for "side effects." AD-2 says `forum` owns the Question/Answer entities. The spine assigns moderation actions (FR-20–FR-21) to `moderation/` but never specifies the mutation path: interface call or event.

**Module A — `forum` (compliant):**  
A `forum` developer reads AD-2: "mutations of an entity → owning module only." They conclude no other module can mutate a Question. They implement `IForumService.hideQuestion(id)` and `IForumService.deleteAnswer(id)` as the only sanctioned paths. They expect `moderation` to call these methods synchronously. They do NOT register any `@OnEvent('moderation.*')` listener because AD-2 implies they should be called, not subscribed to.

**Module B — `moderation` (compliant):**  
A `moderation` developer reads AD-1: "effets de bord → EventEmitter2.emit('module.entity.action')". They conclude that hiding content is a side effect of a moderation decision. They emit `moderation.question.hidden` and `moderation.answer.removed` and expect `forum` to handle them via `@OnEvent`. They do NOT inject `IForumService` because AD-10 forbids importing domain modules and they see no published interface provider token in `forum`'s exports (interface injection requires explicit provider export, which `forum` may or may not configure).

**Incompatibility:**  
`moderation` emits events. `forum` exposes interfaces. Neither calls the other's mechanism. Moderation decisions are silently swallowed: the EventEmitter2 fires with zero listeners, and `IForumService` is never called. Content is never hidden. No error is thrown anywhere.

**ADs this slips through:**  
AD-1 (both mechanisms are valid — no rule selects one over the other for this flow), AD-2 (mutation ownership clear, mutation invocation path is not)

---

### Pair 3 — `votes` ↔ `forum` : Two sources of truth for `Question.voteScore`

**Severity: HIGH**

**The trap in the spine:**  
AD-2 assigns entity ownership but does not address denormalized counters — a standard performance pattern. The naming convention example `forum.question.created` shows `forum` emits question events. `votes` owns votes. No AD says who stores the aggregated vote score on a question.

**Module A — `forum` (compliant):**  
`forum` owns `Question` in Prisma. For list performance (AD-7 drives efficient response shapes), a `forum` developer adds `voteScore Int @default(0)` to the Question model. They subscribe to `votes.question.voted` via `@OnEvent` and increment/decrement the field. `IForumService.getQuestion()` returns `question.voteScore` directly from the row.

**Module B — `votes` (compliant):**  
`votes` owns the `Vote` entity. `IVotesService.getQuestionScore(questionId)` computes the live aggregate via `prisma.vote.aggregate({ where: { questionId }, _sum: { value: 1 } })`. This is consistent with AD-2 (votes owns votes) and AD-1 (cross-module reads via the service interface). The `votes` developer sees no reason to emit an event to update a denormalized field they don't own.

**Incompatibility:**  
`forum.Question.voteScore` and `IVotesService.getQuestionScore()` diverge. The `forum` denormalized counter lags behind under concurrent vote bursts (EventEmitter2 processes handlers serially but two HTTP requests racing produce two emits processed after both votes are committed — the counter increments twice from the same base value). Any consumer that calls `IVotesService` gets the live count; any consumer that reads the Question row gets the stale count. Both are "correct" per their respective owners. No AD is violated.

**ADs this slips through:**  
AD-2 (denormalized fields not covered), AD-1 (event delivery provides no atomicity or consistency guarantee)

---

### Pair 4 — `votes` ↔ `gamification` : Event name collision on "accepted answer"

**Severity: HIGH**

**The trap in the spine:**  
The naming convention is `<module>.<entity>.<action>`. An accepted answer is simultaneously a change to an Answer (owned by `forum`) and a vote-like action (semantic domain of `votes`). The spine gives no rule for cross-domain action semantics.

**Module A — `votes` (compliant):**  
The `votes` developer reads FR-15 ("réponse acceptée") and concludes that acceptance is a special vote gesture by the question author. They implement it in `votes` and emit `votes.answer.accepted` — following the naming convention exactly, with `votes` as the module prefix.

**Module B — `gamification` (compliant):**  
The `gamification` developer reads FR-11 and the capability map "forum/votes → gamification" and subscribes to `forum.answer.accepted` — a name equally valid per the convention, with `forum` as the module prefix since `forum` owns the Answer entity.

**Incompatibility:**  
`votes` emits `votes.answer.accepted`. `gamification` listens for `forum.answer.accepted`. The handler never fires. Reputation points for accepted answers (a core FR-11 mechanic) are silently dropped. No compile error, no runtime error, no AD violation. EventEmitter2 emits to zero listeners without complaint.

**ADs this slips through:**  
AD-1 (naming convention permits both names; no canonical publisher is specified), AD-2 (action ownership determines who emits — ownership is ambiguous here)

---

### Pair 5 — `payments` ↔ `users` : Untyped event payload shape mismatch

**Severity: MEDIUM**

**The trap in the spine:**  
AD-7 enforces the HTTP response envelope `{ data, meta? }` via a global interceptor. No equivalent constraint governs EventEmitter2 event payloads. The spine's consistency conventions name events but specify no payload schema. The consistency table (`libs/shared-types`) is mentioned only for HTTP error codes (`DOMAINE_ENTITE_RAISON`).

**Module A — `payments` (compliant):**  
`payments` emits `payments.session.completed` with the minimal payload it owns: `{ sessionId: string, userId: string, amount: number, currency: string }`. This follows AD-4 (provider abstraction), AD-5 (idempotency key checked before emit), and AD-7 (no HTTP shape concern for events). Amount is an integer in minor units per the monetary convention.

**Module B — `users` (compliant):**  
`users` handles `@OnEvent('payments.session.completed')`. To update membership status, it expects `{ userId: string, planId: string, expiresAt: string }`. The developer derives this requirement from FR-36–FR-38 (subscription tiers, premium membership). They follow AD-2 (only `users` mutates the User entity), AD-1 (consuming an event from another module), and AD-11 (no process.env, only ConfigService). The handler destructures `planId` and `expiresAt` from the payload and gets `undefined` for both at runtime.

**Incompatibility:**  
`payments` never emits `planId` or `expiresAt` because it considers those outside its bounded context. `users` receives the event but silently fails to update membership (no error — `undefined` assignment is valid TypeScript at runtime). Premium features are never activated after payment. No AD is violated by either module. The payload contract has no architectural enforcer.

**ADs this slips through:**  
AD-1 (EventEmitter2 is untyped at runtime; no payload schema), AD-7 (envelope rule applies to HTTP only; events are exempt)

---

## Systemic Root Cause

All five pairs share the same underlying gap: the architecture defines **communication mechanisms** (AD-1, AD-10) and **mutation ownership** (AD-2) but provides no:

1. **Entity-to-module ownership register** — which Prisma model fields belong to which module. "réputation" is in two module descriptions simultaneously.
2. **Event contract registry** — payload shape, canonical emitter, and required consumers for each event name. `<module>.<entity>.<action>` is a naming rule, not a contract.
3. **Mutation-path selector** — when both interface injection and EventEmitter2 are valid (AD-1), no rule says which to use for a given cross-module action (hiding content, updating membership).
4. **Denormalized field policy** — AD-2 governs entity rows but not derived/cached fields that two modules could independently maintain.

---

## Remediation Recommendations

| Gap | Fix |
|---|---|
| Dual reputation ownership | Add one line to spine: "User.reputationScore owned and mutated by `gamification/` exclusively; `users/` exposes read-only projection via IUsersService." |
| Mutation path ambiguity | Add rule: "Interface injection (synchronous) for mutations that must complete before the HTTP response returns; EventEmitter2 for fire-and-forget side effects." |
| Event contract registry | Add `libs/shared-types/src/events.ts` as part of the spine: typed payload interfaces per event name, with canonical emitter annotated. |
| Denormalized counter ownership | Add rule: "Denormalized counters on an entity belong to that entity's owning module and are updated only by that module's event handler." |
| Event payload enforcement | Add `libs/shared-types/src/events.ts` and require all `emit()` calls to pass a typed payload matching the shared interface (TS strict mode will catch mismatches at compile time). |
