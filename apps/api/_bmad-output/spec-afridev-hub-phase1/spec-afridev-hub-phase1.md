---
id: spec-afridev-hub-phase1
companions:
  - ../architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md
  - glossary.md
sources:
  - ../prd-afridev-hub/prd-afridev-hub.md
created: 2026-10-13
updated: 2026-10-13
---

# Spec — AfriDev Hub Phase 1

## Why

Les développeurs d'Afrique sub-saharienne n'ont pas de lieu communautaire pensé pour leurs contraintes réelles : connexions 3G intermittentes, paiements mobiles locaux (Wave, Orange Money), marché de l'emploi régional, et besoin de partager en français. Stack Overflow et LinkedIn ne répondent pas à ces usages. AfriDev Hub Phase 1 pose le socle : un forum Q&A technique, une vitrine de projets open-source, un job board avec salaire transparent en devise locale, et une couche de paiement africain abstraite — le tout sous un score de réputation construit à travers les contributions, lisible par les recruteurs et les startups locales.

## Capabilities

### CAP-1 — Design System & Infrastructure

**Intent:** Fournir un design system opérationnel partagé (tokens couleur/typo + composants shadcn/ui) entre `apps/web` et `libs/shared-types`, et le socle technique local (monorepo Nx, Docker Compose, CI/CD) avant toute feature utilisateur. Couvre FR-3 (FR-1 et FR-2 sont des pipelines déployés séparément).

**Success:** Les composants `Button`, `Input`, `Card` respectent les tokens définis ; Storybook (ou équivalent) liste les composants partagés ; `docker compose up` démarre les 4 services sans erreur en < 3 min ; chaque merge sur `main` déclenche un déploiement automatique sur Systalink en < 5 min.

---

### CAP-2 — Authentification & Profils

**Intent:** Permettre à un visiteur de créer un compte (email/mot de passe, OAuth GitHub, OAuth Google), de compléter un onboarding 3 étapes (pays, stack, niveau), d'accéder à son profil public à `/@username`, d'obtenir automatiquement un badge « vérifié » (5 critères), et de voir son score de réputation mis à jour en temps réel. Couvre FR-4–FR-11.

**Success:** Inscription bout-en-bout fonctionnelle (email confirmé en < 60 s, OAuth GitHub et Google opérationnels) ; onboarding sauté si champs déjà renseignés ; badge attribué et retiré automatiquement dès que les 5 conditions changent ; profil public accessible sans authentification avec meta-tags Open Graph ; score de réputation s'actualise sur le profil public sans rechargement de page (WebSocket).

---

### CAP-3 — Forum Q&A

**Intent:** Permettre aux membres de poser des questions techniques en Markdown (titre ≥ 15 chars, corps ≥ 50 chars, 1-5 tags), de voir avant soumission les 3 questions les plus similaires (similarité ≥ 0,6), de répondre, de voter (réputation ≥ 10), de marquer une réponse acceptée, de recevoir des notifications in-app (< 3 s) et email (< 5 min), de rechercher par mots-clés ou tags (< 300 ms / 10 000 questions), et aux modérateurs de traiter les signalements. Couvre FR-12–FR-21.

**Success:** SM-2 — 100+ questions publiées avec au moins 1 réponse dans les 30 jours post-bêta ; SM-7 — taux de questions avec réponse acceptée > 30 % après 30 jours ; la queue de modération est accessible (rôle Modérateur) et chaque action de masquage reflétée immédiatement côté utilisateur.

---

### CAP-4 — Vitrine Projets

**Intent:** Permettre aux membres de soumettre leurs projets open-source (lien GitHub validé, description ≥ 50 chars, stack, catégorie, pays), d'importer automatiquement les stats GitHub (stars, langage, date), d'étoiler des projets, et de filtrer la vitrine par catégorie + stack + pays avec URL partageable. Couvre FR-22–FR-27.

**Success:** SM-6 — 5+ projets soumis avec stats GitHub importées ; page projet accessible sans authentification avec meta-tags Open Graph ; filtres combinables avec URL partageable reflétant les filtres actifs.

---

### CAP-5 — Job Board

**Intent:** Permettre à un recruteur de publier une offre avec salaire obligatoire en devise locale, aux membres de filtrer par pays/mode/stack/fourchette salariale avec affichage multi-devises (conversion taux du jour), de candidater directement (message + lien profil + CV PDF ≤ 5 MB stocké R2), d'activer des alertes email hebdomadaires, et aux offres d'expirer automatiquement à J60 avec rappel J50. Plan recruteur premium à 25 000 FCFA/mois (offres illimitées, profils complets). Couvre FR-28–FR-34.

**Success:** SM-5 — 10+ offres publiées avec salaire dans les 60 jours post-lancement ; un recruteur ne peut pas dupliquer une candidature d'un même membre ; le recruteur reçoit un email pour chaque candidature ; une offre expirée disparaît des résultats de recherche.

---

### CAP-6 — Paiements Africains

**Intent:** Exposer une interface `PaymentProvider` abstraite (`initiate`, `capture`, `refund`, `getStatus`) implémentée par Wave (Sénégal/CI), Orange Money (Phase 1 si sandbox confirmé avant S7), et Stripe (fallback carte). Traiter les webhooks de façon idempotente (idempotency key PostgreSQL). Envoyer un reçu email après chaque paiement confirmé. Couvre FR-35–FR-40.

**Success:** SM-3 — 1 paiement Wave bout-en-bout confirmé en production (webhook reçu et capturé) ; un webhook dupliqué sur la même référence retourne HTTP 200 sans double traitement ; ajout d'un nouveau provider = nouvelle classe sans modifier les modules métier.

---

## Constraints

- **Performance:** Réponse API (lectures) < 200 ms au p95 pour 10 000 questions (cache Redis). Recherche full-text < 300 ms. Notifications WebSocket < 3 s.
- **Sécurité:** JWT access token 15 min / refresh token 7 j stocké en Redis (whitelist, révocable). HTTPS obligatoire. Mots de passe bcrypt coût ≥ 12. Rate limiting 100 req/min/IP sur endpoints publics (login, inscription, recherche).
- **Données:** Montants monétaires en entiers (centimes/unités minimales) — jamais float. Identifiants UUID v4. Dates ISO 8601 UTC.
- **Fichiers:** Assets (avatars, CV) dans Cloudflare R2, ≤ 5 MB par fichier. Upload direct client→R2 via presigned URL (NestJS ne proxie pas les bytes).
- **Architecture:** Modular Monolith NestJS 10. Modules domaine communiquent via interfaces TypeScript injectées (synchrone) et EventEmitter2 (side-effects). Aucun module domaine n'importe un autre directement. Voir spine `../architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md` (AD-1 à AD-12, contraintes liant tous les modules).
- **Déploiement:** Systalink, processus Node.js unique. PostgreSQL 16, Redis, Cloudflare R2 provisionnés séparément. Pas de primitives cloud incompatibles (Lambda, Cloud Run, K8s auto-scaling) Phase 1.
- **Observabilité:** Logs JSON structurés (Pino). Erreurs 5xx alertées en < 5 min. Pas de `console.log` en code applicatif.
- **Accessibilité:** WCAG 2.1 niveau AA sur les parcours critiques (inscription, forum, candidature).
- **Interface:** Français v1. Anglais planifié Phase 2.

## Non-goals

- Messagerie directe entre membres (v1).
- Application mobile native iOS/Android (app store). La PWA couvre le mobile — Phase 2.
- Formations en ligne, cours, certifications.
- API publique pour développeurs tiers.
- M-Pesa / MTN MoMo Phase 1 (sauf confirmation partenariat).
- Internationalisation anglophone Phase 1.
- Dashboard analytics avancé pour recruteurs (au-delà des candidatures reçues).
- Tests de compétences intégrés (coding challenges, quiz).
- Mentorat 1-to-1 (FR-41–FR-49) — Phase 2.
- PWA & Offline-First (FR-50–FR-57) — Phase 2 (Lighthouse CI ≥ 75 objectif de design Phase 1 sans implémentation offline).
- Groupes & Communautés (FR-58–FR-62) — Phase 2.
- Scaling horizontal NestJS — Phase 2 (Redis adapter Socket.io).
- Haute disponibilité (HA) Phase 1 — mono-instance Systalink acceptable pour bêta.

## Success Signal

Phase 1 est réussie si, à la bêta fermée (fin Sprint 8) et dans les 30–60 jours post-lancement :

- **SM-1:** 50 membres inscrits et actifs (≥ 1 question ou réponse) à la bêta fermée.
- **SM-2:** 100+ questions publiées avec au moins 1 réponse dans les 30 jours post-bêta.
- **SM-3:** 1 paiement Wave réussi bout-en-bout en production (webhook confirmé).
- **SM-4:** Score Lighthouse Performance > 75 en 3G simulé dès Phase 1.
- **SM-5:** 10+ offres publiées avec salaire dans les 60 jours post-lancement.
- **SM-6:** 5+ projets soumis avec stats GitHub importées.
- **SM-7:** Taux de questions avec réponse acceptée > 30 % après 30 jours.

Contre-métriques — ne pas optimiser : taux de signalement de contenu (qualité > volume) ; temps passé sur la plateforme (utilité, pas rétention addictive).

## Assumptions

- Orange Money Phase 1 si accès sandbox confirmé avant Sprint 7 ; sinon Phase 2.
- MTN MoMo Phase 2 (pas de confirmation partenariat à ce jour).
- PM2 pour le process management sur Systalink (NFR-9).
- Taux de change (FR-29/FR-30) via API publique (ExchangeRate-API), rafraîchis quotidiennement. CurrencyService = implémentation déléguée.
- Outil monitoring à choisir en Phase 1 : Sentry ou équivalent gratuit.
- Pas de HA Phase 1 (Systalink mono-instance) — acceptable pour bêta fermée.
- Seuil de score de spam vitrine projets (FR-27) à définir.

## Open Questions

1. **Orange Money Phase 1 :** L'accès sandbox Orange Money Sénégal/CI est-il confirmé avant Sprint 7 ?
2. **Langue de l'interface :** Intégralement français v1, ou bilingue FR/EN dès le lancement ?
3. **Seuil d'auto-masquage :** Nombre de signalements pour déclenchement sans intervention humaine (FR-20/FR-21) — à définir avant Sprint 7.
4. **Recruteur sans compte :** Doit créer un compte Membre d'abord, ou flow recruteur séparé ?
5. **RGPD/CNIL :** Analyse requise avant lancement public (diaspora africaine en France) ?
6. **Stripe Phase 1 :** Utilisé pour le plan recruteur premium (FR-34), ou uniquement Phase 2 (sessions mentorat) ?
