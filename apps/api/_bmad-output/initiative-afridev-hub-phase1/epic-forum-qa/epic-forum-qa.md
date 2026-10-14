---
type: epic
title: Forum Q&A
parent: ../initiative-afridev-hub-phase1.md
covers: ["CAP-3"]
created: 2026-10-13
---

# Forum Q&A

Livre le cœur communautaire de la plateforme : un forum technique où les membres posent des questions, répondent, votent et acceptent des réponses. Les actions de gamification (votes, réponses, acceptation) alimentent la réputation via `GamificationModule`. Les notifications d'activité (nouvelle réponse, commentaire) sont poussées via `NotificationsModule`. La modération (signalement, masquage) est accessible aux MODERATOR.

## Outcome

Forum Q&A pleinement fonctionnel en production : questions techniques posées et répondues, votes bidirectionnels, acceptation de réponse, réputation mise à jour en temps réel, file de modération accessible aux MODERATOR, notifications in-app et email sur activité pertinente.

## Done when

- Un membre peut poser une question, répondre, voter (+/−) et accepter une réponse ; chaque action met à jour `reputation` en temps réel via WebSocket.
- File de modération accessible aux MODERATOR : signalements visibles, contenu masquable (FR-20/FR-21 — seuil d'auto-masquage à définir avant S7).
- Notifications in-app délivrées pour : nouvelle réponse à ma question, commentaire sur ma réponse (via `NotificationsModule`).
- SM-2 mesurable : structure permettant de vérifier 100+ questions avec ≥ 1 réponse dans les 30 jours post-bêta.
- SM-7 mesurable : taux de questions avec réponse acceptée calculable pour le suivi post-lancement (> 30 % cible).
- Déployé en production Systalink.

## Boundaries

**In scope :** CRUD questions, réponses, commentaires ; votes bidirectionnels (+/−) ; acceptation de réponse par l'auteur ; tags/catégories ; recherche full-text basique ; file de modération MODERATOR ; notifications Q&A (in-app + email) ; handlers `GamificationModule` pour les events de cet épic ; pagination.

**Out of scope :** éditeur riche (Markdown simple suffit Phase 1), images dans les posts (upload traité dans E2, lien simple si besoin), messagerie directe (Phase 2), votes sur commentaires (Phase 2), historique de révision des questions (Phase 2).

**Touch points consommés :**
- `GamificationModule` (E2) — ajout de handlers pour EventEmitter2 events : `question.posted`, `answer.posted`, `answer.accepted`, `vote.received`
- `NotificationsModule` (E2) — appel `notify()` sur nouvelle réponse, commentaire
- `JWT guards` (E2) — routes protégées membres/MODERATOR

## Notes

**Tracer bullet :** question postée → réponse postée → vote sur réponse → `reputation` de l'auteur de la réponse incrémenté en temps réel via WebSocket — chemin complet du tracer path initiative (E1 → E2 → E3).

**Open question critique :** Seuil d'auto-masquage signalements (FR-20/FR-21) — doit être défini avant Sprint 7. Ajouter comme `unknown` sur la story de modération.

**Décisions :**
- `GamificationModule` reste le seul writer de `reputation` ; E3 y ajoute des handlers via `EventEmitter2`, pas d'import direct depuis ForumModule (AD-3, AD-5).
- `NotificationsModule` reste le seul consommateur Socket.io ; ForumModule émet des events, ne push pas directement (AD-7).

## References

- Initiative : `../initiative-afridev-hub-phase1.md`
- Spec CAP-3 : `../../spec-afridev-hub-phase1/spec-afridev-hub-phase1.md`
- Architecture spine (AD-3, AD-5, AD-7) : `../../architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md`
- Glossaire : `../../spec-afridev-hub-phase1/glossary.md`
- AGENTS.md : `../../../AGENTS.md`
