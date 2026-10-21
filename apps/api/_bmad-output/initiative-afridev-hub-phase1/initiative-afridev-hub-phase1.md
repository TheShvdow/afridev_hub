---
type: initiative
title: AfriDev Hub Phase 1
created: 2026-10-13
spec: ../spec-afridev-hub-phase1/spec-afridev-hub-phase1.md
status: in-progress
---

# AfriDev Hub Phase 1

Plateforme communautaire pour développeurs d'Afrique sub-saharienne : forum Q&A technique, vitrine de projets open-source, job board avec salaire transparent en devise locale, et couche de paiement africaine abstraite (Wave, Stripe). L'initiative couvre les sprints S1–S16, cible une bêta fermée à S17, et déploie sur Systalink comme processus NestJS unique.

## Outcome

Une plateforme en production où des développeurs africains peuvent poser des questions techniques, partager leurs projets, trouver un emploi avec salaire visible, et où un recruteur peut publier une offre et payer son plan premium via Wave ou Stripe.

## Done when

- SM-1 : 50 membres inscrits et actifs (≥ 1 question ou réponse) à la bêta fermée.
- SM-2 : 100+ questions publiées avec ≥ 1 réponse dans les 30 jours post-bêta.
- SM-3 : 1 paiement Wave réussi bout-en-bout en production (webhook confirmé).
- SM-4 : Score Lighthouse Performance > 75 en 3G simulé.
- SM-5 : 10+ offres publiées avec salaire dans les 60 jours post-lancement.
- SM-6 : 5+ projets soumis avec stats GitHub importées.
- SM-7 : Taux de questions avec réponse acceptée > 30 % après 30 jours.

## Boundaries

**In scope :** CAP-1 à CAP-6 tels que définis dans la spec.

**Out of scope (Phase 2) :** messagerie directe, app mobile native, formations en ligne, API publique, M-Pesa/MTN MoMo, i18n anglophone, mentorat 1-to-1, PWA offline-first, groupes & communautés, scaling horizontal NestJS.

**Touch points** (unités consommées ou configurées par l'initiative, non propriétaires d'un épic) :

| Unité | Epic owner | Étendu dans |
|---|---|---|
| `GamificationModule` (seul writer de `reputation`) | epic-auth-profiles | epic-forum-qa (handlers votes/réponses/acceptation) |
| `NotificationsModule` (gateway Socket.io + store in-app) | epic-auth-profiles | epic-forum-qa (events Q&A), epic-job-board (alertes job) |
| `UploadModule` (presigned URL R2 — AD-6) | epic-auth-profiles (avatar) | epic-job-board (CV PDF, contraintes MIME/taille) |
| `@nestjs/schedule` | epic-job-board (premier consommateur) | — |
| `CurrencyService` (ExchangeRate-API, refresh quotidien) | epic-job-board | — |

## Known decisions

- Decision: 2026-10-13 — 6 épics, une CAP par épic, chaque épic livré en production par un owner.
- Decision: 2026-10-13 — Ordre de build recommandé : E1 → E2 → E3 → E5 → E4 → E6. E3, E4, E5 sont techniquement parallèles après E2 ; E6 attend E5 (trigger recruiter premium FR-34).
- Decision: 2026-10-13 — Architecture spine AD-1 à AD-12 est le document de décision cross-épic autoritaire ; aucun contrat supplémentaire n'est nécessaire à ce niveau.
- Decision: 2026-10-13 — `bmad setup` à lancer avant l'inception du premier épic pour mettre à jour `_bmad/method/scripts/`.

## Notes

**Tracer path (première démo) :** E1 → E2 → une question posée + réponse votée sur E3 → score réputation mis à jour en temps réel via WebSocket. Ce chemin traverse design system, auth, forum, gamification et WebSocket en une seule session démo.

**Open questions (héritées de la spec) :**
1. Orange Money Phase 1 : sandbox confirmé avant S7 ?
2. Seuil d'auto-masquage signalements (FR-20/FR-21) — à définir avant Sprint 7.
3. Recruteur sans compte : flow séparé ou compte Membre d'abord ?
4. Stripe Phase 1 : plan recruteur premium (FR-34) ou Phase 2 seulement ?

## References

- Spec : `../spec-afridev-hub-phase1/spec-afridev-hub-phase1.md`
- Glossaire : `../spec-afridev-hub-phase1/glossary.md`
- Architecture spine : `../architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md`
- AGENTS.md : `../../AGENTS.md`
