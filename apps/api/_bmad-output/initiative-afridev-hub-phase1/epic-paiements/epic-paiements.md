---
type: epic
title: Paiements Africains
parent: ../initiative-afridev-hub-phase1.md
covers: ["CAP-6"]
created: 2026-10-13
status: in-progress
---

# Paiements Africains

> **Décision 2026-10-14 :** l'agrégateur de paiement retenu est **Bictorys**. Une interface `IPaymentProvider`, une implémentation. Wave, Orange Money et MTN passent par Bictorys ; Stripe est retiré. (Critères reformulés le 2026-10-21.)

Livre la couche de paiement qui permet aux recruteurs de souscrire au plan premium (FR-34) via Bictorys (Wave, Orange Money, etc.). `PaymentsService` reçoit l'agrégateur par le jeton `PAYMENT_PROVIDER` ; changer d'agrégateur = changer cette liaison, sans modifier les modules métier. Les webhooks sont confirmés auprès de Bictorys et sans double traitement. Un reçu email est envoyé après chaque paiement réussi.

## Outcome

Paiement Bictorys (Wave SN en priorité) confirmé de bout en bout en production : webhook ou réconciliation, plan premium activé, reçu envoyé. SM-3 validé.

## Done when

- SM-3 : au moins 1 paiement Bictorys réussi de bout en bout en production — paiement `CAPTURED`, plan recruteur activé, reçu envoyé.
- Un webhook dupliqué retourne HTTP 200 sans retraiter le paiement (mise à jour conditionnelle sur `PENDING`).
- Le prix vient du catalogue côté serveur : le client choisit un produit, jamais un montant ni une cible.
- Ajouter un agrégateur = une classe implémentant `IPaymentProvider` et la liaison du jeton `PAYMENT_PROVIDER` (AD-8).
- Reçu email envoyé automatiquement après chaque paiement réussi via `MailModule`.
- Déployé en production Systalink avec les clés Bictorys de production.

## Boundaries

**In scope :** interface `IPaymentProvider` + jeton `PAYMENT_PROVIDER`, provider Bictorys (mobile money, webhook, statut, réconciliation), catalogue de prix, activation du plan recruteur premium (FR-34), reçu email, logs paiement.

**Out of scope :** Stripe ; paiement par carte (bloqué côté Bictorys, voir `bictorys-integration-notes.md`) ; remboursements (Phase 2) ; abonnement à renouvellement automatique (chaque mois est un paiement) ; factures mensuelles (Phase 2) ; sessions de mentorat et cours (Phase 2).

**Touch points consommés :**
- Profil recruteur et `RecruiterPlan` (E5) — le quota gratuit est le déclencheur FR-34 ; E6 active le plan.
- `MailModule` (E1) — reçu email.
- `NotificationsModule` (E2) — confirmation in-app (`payments.payment.captured`).

## Notes

**Tracer bullet :** recruteur → `GET /payments/products` → `POST /payments/initiate` (`RECRUITER_PREMIUM_MONTHLY`) → page Bictorys sandbox → webhook ou réconciliation → `CAPTURED`, plan premium 30 jours, reçu email.

**Décisions 2026-10-21 :**
- Prix côté serveur (`payments/catalog.ts`) : 25 000 FCFA par mois, réglable par `RECRUITER_PREMIUM_PRICE_XOF`. Profil recruteur requis.
- Le statut `CAPTURED` et l'activation du plan sont écrits dans la même transaction. Un paiement fait avant la fin d'une période premium prolonge cette période de 30 jours.
- Le reçu et la notification partent après la transaction ; un échec d'envoi ne défait pas le paiement.

**Reste ouvert :** valider en sandbox, avec un vrai paiement du mainteneur, le format réel du webhook et la confirmation par l'API de statut (clés Bictorys absentes de l'environnement local au 2026-10-21).

## References

- Initiative : `../initiative-afridev-hub-phase1.md`
- Spec CAP-6 : `../../spec-afridev-hub-phase1/spec-afridev-hub-phase1.md`
- Architecture spine (AD-8) : `../../architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md`
- Notes Bictorys : `../../architecture-afridev-hub-phase1/bictorys-integration-notes.md`
- AGENTS.md : `../../../AGENTS.md`
