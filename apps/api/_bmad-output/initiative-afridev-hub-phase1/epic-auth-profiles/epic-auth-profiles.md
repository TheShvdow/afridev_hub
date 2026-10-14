---
type: epic
title: Authentification & Profils
parent: ../initiative-afridev-hub-phase1.md
covers: ["CAP-2"]
created: 2026-10-13
---

# Authentification & Profils

Fournit l'identité, la réputation et les modules partagés dont les épics 3, 4 et 5 ont besoin pour démarrer. Un membre peut s'inscrire par email ou OAuth (GitHub, Google), compléter son profil, voir son score de réputation évoluer en temps réel, et obtenir le badge « dev vérifié ». `GamificationModule`, `NotificationsModule` et `UploadModule` R2 sont scaffoldés et exposent leurs interfaces contractuelles.

## Outcome

Authentification complète (email + OAuth, JWT access/refresh), profil public avec OG meta, badge vérifié automatique, réputation WebSocket en temps réel ; `GamificationModule`, `NotificationsModule` et `UploadModule` exportent leurs interfaces pour E3 et E5 ; le tout déployé en production Systalink.

## Done when

- Inscription email : confirmation arrive en < 60 s, lien valide 24 h, renvoi possible.
- OAuth GitHub et Google fonctionnels (redirect → création de compte ou liaison de compte existant).
- Badge « dev vérifié » attribué automatiquement dès que les critères spec sont remplis, révoqué si perdus.
- Page profil public renvoie les meta OG (og:title, og:image, og:description) consommables par les crawlers.
- `reputation` mis à jour en temps réel via WebSocket sans rechargement de page côté client.
- `GamificationModule.addPoints(userId, delta, reason)` exporté et opérationnel ; seul writer de `reputation` (AD-5).
- `NotificationsModule` : gateway Socket.io up, store in-app opérationnel, `notify(userId, payload)` exporté (AD-7).
- `UploadModule` : endpoint presigned URL R2 fonctionnel pour avatars, contraintes MIME/taille appliquées (AD-6).
- Déployé en production Systalink et accessible publiquement.

## Boundaries

**In scope :** inscription email (confirm + resend), OAuth GitHub/Google, JWT access + refresh tokens, onboarding profil (skip si déjà rempli), avatar upload R2, badge vérifié, profil public, `GamificationModule` (scaffold + règles de réputation Phase 1 pour les events de cet épic), `NotificationsModule` (Socket.io gateway + store in-app), `UploadModule` (presigned URL R2, avatar).

**Out of scope :** handlers de gamification pour votes/réponses/acceptation (ajoutés dans E3), alertes job (ajoutées dans E5), upload CV PDF (contraintes MIME/taille étendues dans E5), suppression de compte, rôle MODERATOR activé fonctionnellement (stub ici, logique modération dans E3).

**Touch points fournis :**
- `GamificationModule` → étendu dans E3 (handlers votes/réponses/acceptation via EventEmitter2)
- `NotificationsModule` → étendu dans E3 (events Q&A) et E5 (alertes job)
- `UploadModule` → étendu dans E5 (CV PDF, MIME/taille supplémentaires)

## Notes

**Tracer bullet :** inscription → login → `GET /users/:username` retourne profil public avec `reputation: 0` — prouve JWT, Prisma User, OG meta et WebSocket score côté client en une seule session démo.

**Règles de réputation Phase 1 (glossaire, exhaustives) :** +5 vote reçu, +10 réponse postée, +10 réponse acceptée, −2 vote négatif reçu, +15 question posée. Le projet étoilé N'affecte PAS la réputation Phase 1 — E4 (Vitrine) ne touche donc pas GamificationModule, pas de collision quand E3/E4 tournent en parallèle.

**Décisions cross-épics (spine) :**
- `GamificationModule` seul writer de `reputation` ; les autres modules passent par `EventEmitter2` (AD-5).
- `NotificationsGateway` seul consommateur Socket.io ; les autres modules passent par events (AD-7).
- Upload R2 presigned URL côté serveur uniquement, jamais credentials exposés au client (AD-6).

**Open question héritée :** Recruteur sans compte — flow séparé ou compte Membre d'abord ? (impacte le rôle RECRUITER scaffoldé ici, décision requise avant E5 au plus tard).

## References

- Initiative : `../initiative-afridev-hub-phase1.md`
- Spec CAP-2 : `../../spec-afridev-hub-phase1/spec-afridev-hub-phase1.md`
- Architecture spine : `../../architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md`
- Glossaire (règles réputation Phase 1) : `../../spec-afridev-hub-phase1/glossary.md`
- AGENTS.md : `../../../AGENTS.md`
