---
type: epic
title: Interfaces web Phase 1
parent: ../initiative-afridev-hub-phase1.md
covers: ["CAP-1", "CAP-2", "CAP-3", "CAP-4", "CAP-5", "CAP-6"]
created: 2026-10-27
status: in-progress
---

# Interfaces web Phase 1

Livre côté Angular les écrans des capacités déjà construites côté API par E2 à E6 : profil et badge, forum, vitrine projets, offres d'emploi, notifications, modération et administration, puis plan recruteur. Les épics E1 à E6 ont livré l'API ; l'écart constaté le 2026-10-27 entre le front et les règles de gestion de l'API est la raison d'être de cet épic.

## Outcome

Un membre, un recruteur, un modérateur et un administrateur accomplissent dans l'interface web, contre l'API réelle, chaque parcours de la Phase 1 : aucune règle de gestion de l'API n'est contournée ni contredite par un écran, et aucun écran ne repose sur des données statiques de démonstration.

## Done when

- Les parcours du badge vérifié, du forum (question, réponse ≥ 30 caractères, vote, acceptation, modification, signalement), des offres (liste, détail, candidature avec CV, publication, tableau de bord recruteur, alertes) et des notifications fonctionnent contre l'API.
- Les modérateurs traitent les signalements et valident les offres ; les administrateurs gèrent les rôles, les bannissements et lisent le journal d'audit et les indicateurs.
- Le plan premium se paie en sandbox Bictorys depuis l'écran du recruteur (FR-34, SM-3).
- Une suite de bout en bout passe contre une base peuplée par `npm run prisma:seed:demo`.
- Le Quality Gate SonarCloud est au vert et le front est déployé en production Systalink.

## Boundaries

**In scope :** écrans et services front des CAP-2 à CAP-6 ; petits ajouts d'API strictement nécessaires à un écran (lien des notifications, état de bannissement, vote du membre, cibles des signalements) ; seed de démonstration.

**Out of scope :** Mentorat et communautés (phase 2, voir story 20), messagerie, application mobile, nouvelles règles de gestion non décrites par la spec.

**Touch points consommés :**
- Toutes les routes des modules `auth`, `users`, `forum`, `votes`, `projects`, `jobs`, `notifications`, `moderation`, `admin`, `payments`, `upload` (propriétaires : E2 à E6).
- `NotificationsGateway` (E2) pour le temps réel (story 15).

## Notes

**Tracer bullet :** story 3, offres d'emploi : liste filtrée, détail, candidature et publication contre l'API réelle.

**Decision:** 2026-10-27 — épic transverse, séparé de E2 à E6 : ceux-ci restent des épics d'API livrés et clos, le front est suivi ici. Les ids CAP cités en `covers` sont partagés avec eux ; chaque story précise la part qu'elle livre (le front).

**Decision:** 2026-10-27 — la page « Projets à approuver » est supprimée : l'API publie les projets d'emblée (story 4.1) et les modère par signalement.

**Decision:** 2026-10-27 — la règle « réponse ≥ 30 caractères » du glossaire et du PRD est appliquée par l'API et par le front.

**Decision:** 2026-10-27 — E7 de plus de trois entrées : le « Refactor sweep » (21) attend toutes les stories sauf le bout en bout (22).

**Decision:** 2026-10-27 — les données de démonstration vivent dans une base Neon dédiée, jamais dans la base partagée de développement ni de production. Seule cette base reçoit `npm run prisma:seed:demo`.

**État 2026-10-27 :** stories 1 à 9 livrées sur `feat/import-front` (PR #13), non fusionnée. La migration `20261027120000_notification_link` est appliquée à la base de démonstration (story 10) mais pas à la base partagée.

**Decision:** 2026-10-28 — Mentorat et communautés (phase 2) restent en vitrine avec contenu d'exemple : bandeau « Aperçu » sur les deux pages, sections et boutons d'action désactivés (réservation, rejoindre, participer, charger plus), mention « Aperçu · bientôt disponible » sur la section Mentors de l'accueil. Les liens du menu sont conservés. Les profils affichés restent fictifs jusqu'à la phase 2.

**Open questions :**
1. Déploiement du front sur Systalink : commande de build et variable `apiUrl` de production (hors dépôt à ce jour).
2. Mentorat et communautés (story 20).

## References

- Initiative : `../initiative-afridev-hub-phase1.md`
- Spec CAP-1 à CAP-6 : `../../spec-afridev-hub-phase1/spec-afridev-hub-phase1.md`
- Contrat de données, sections 6 à 9 : `../../architecture-afridev-hub-phase1/data-contract-afridev-hub-phase1.md`
- Glossaire : `../../spec-afridev-hub-phase1/glossary.md`
- Seed de démonstration : `../../../../../prisma/seed-demo.ts`
- AGENTS.md : `../../../AGENTS.md`
