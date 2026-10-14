---
type: epic
title: Paiements Africains
parent: ../initiative-afridev-hub-phase1.md
covers: ["CAP-6"]
created: 2026-10-13
---

# Paiements Africains

> **Décision 2026-10-14 :** l'agrégateur de paiement retenu est **Bictorys**. Une interface `IPaymentProvider`, une implémentation. Wave, Orange Money, MTN MoMo et Stripe sont retirés de cet épic. Les critères Wave, Stripe et Orange ci-dessous sont à reformuler dans un `bmad-correct-course`.

Livre la couche de paiement abstraite qui permet aux recruteurs de souscrire un plan premium via Wave (mobile money) ou Stripe (carte). Un `PaymentProviderFactory` délègue à des classes provider interchangeables ; ajouter un provider = ajouter une classe, sans modifier les modules métier. Les webhooks sont idempotents. Un reçu email est envoyé après chaque paiement réussi.

## Outcome

Paiement Wave confirmé bout-en-bout en production (webhook capturé, plan activé, reçu email envoyé), couche d'abstraction `PaymentProviderFactory` opérationnelle, webhooks idempotents, et SM-3 validé.

## Done when

- SM-3 : au moins 1 paiement Wave réussi bout-en-bout en production — webhook de confirmation capturé, `reçu` en base, plan recruteur activé.
- Un webhook Wave ou Stripe dupliqué retourne HTTP 200 sans retraiter le paiement (idempotence par `payment_id` unique).
- Ajouter un nouveau provider = créer une nouvelle classe implémentant l'interface `IPaymentProvider` ; aucun module métier (JobsModule, UsersModule) n'a besoin d'être modifié (AD-8).
- Reçu email envoyé automatiquement après chaque paiement réussi via `MailModule`.
- Déployé en production Systalink avec les clés Wave production actives.

## Boundaries

**In scope :** `PaymentProviderFactory` + interface `IPaymentProvider`, provider Wave (paiement mobile money, webhook), provider Stripe (carte — à confirmer : Phase 1 ou Phase 2 selon open question FR-34), activation plan recruteur premium (FR-34), webhooks idempotents, reçu email, logs paiement.

**Out of scope :** Orange Money Phase 1 (sandbox à confirmer avant S7 — open question héritée), M-Pesa/MTN MoMo (Phase 2), remboursements (Phase 2), factures mensuelles (Phase 2), tableau de bord recruteur analytiques paiement (Phase 2).

**Touch points consommés :**
- Entité Job + rôle RECRUITER (E5) — condition d'accès au plan premium
- `plan premium trigger` (FR-34) (E5) — déclenche le flow paiement
- `MailModule` (E1) — reçu email post-paiement

**Touch points non consommés ici :** `GamificationModule`, `NotificationsModule`, `UploadModule` — non impliqués dans le flow paiement.

## Notes

**Tracer bullet :** recruteur clique « Passer premium » → redirection Wave sandbox → webhook reçu → plan activé en base → reçu email envoyé — chemin complet bout-en-bout avant d'aller en production.

**Open question critique :** Orange Money Phase 1 — sandbox disponible avant S7 ? Si non, Wave seul suffit pour SM-3 ; Orange Money repasse en Phase 2.

**Open question héritée :** Stripe Phase 1 — si FR-34 est Phase 1, implémenter le provider Stripe ici ; sinon stub avec `throw new NotImplementedException()` et `feature flag`.

**Décision :** `PaymentProviderFactory` seul owner de la logique de routage provider (AD-8) — aucun module de domaine n'importe de provider directement.

**Décision :** Wave sandbox doit être confirmé opérationnel avant l'inception de cet épic.

## References

- Initiative : `../initiative-afridev-hub-phase1.md`
- Spec CAP-6 : `../../spec-afridev-hub-phase1/spec-afridev-hub-phase1.md`
- Architecture spine (AD-8) : `../../architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md`
- AGENTS.md : `../../../AGENTS.md`
