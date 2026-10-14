---
type: epic
title: Infrastructure & Design System
parent: ../initiative-afridev-hub-phase1.md
covers: ["CAP-1"]
created: 2026-10-13
---

# Infrastructure & Design System

Pose la fondation technique et visuelle dont tous les épics suivants dépendent : pipeline CI/CD, services Docker (Postgres, Redis), modules d'infrastructure NestJS (Prisma, Redis, Mail, Config), et design system (tokens + composants Storybook). L'épic est terminé quand un développeur peut `docker compose up`, lancer les tests en CI, et importer un module d'infrastructure sans dépendance circulaire.

## Outcome

Pipeline CI opérationnel déployant sur Systalink, stack Docker locale fiable, modules d'infrastructure NestJS exportés et consommables par E2+, design tokens appliqués dans les composants partagés avec Storybook comme référence visuelle de l'équipe.

## Done when

- `docker compose up` termine en < 3 min, tous les services passent le health check.
- CI (lint + tests + build) passe au vert et déploie sur Systalink staging en < 5 min sur la branche main.
- `PrismaModule`, `RedisModule`, `MailModule`, `ConfigModule` importables dans n'importe quel module de domaine sans dépendance circulaire (vérifié par test d'import ou build propre).
- Au moins Button, Input et Card existent dans Storybook avec les design tokens appliqués (couleur, typographie, espacement).
- `nestjs-pino` actif : logs structurés JSON en production, lisibles en développement.

## Boundaries

**In scope :** CI GitHub Actions, Docker Compose (Postgres 15, Redis 7), scaffold NestJS 10 (AppModule, PrismaModule, RedisModule, MailModule, ConfigModule, HealthModule), design tokens (couleurs, typo, spacing), composants partagés Button/Input/Card, Storybook, configuration Joi, structure de répertoires `src/{domain}/` (modules stub vides pour chaque domaine fonctionnel).

**Out of scope :** logique métier de tout domaine fonctionnel (auth, forum, jobs, payments, etc.), schéma Prisma au-delà d'un modèle de santé ou d'infra, UI screens produit.

**Touch points consommés ici :** aucun — c'est l'épic fondateur.

**Touch points fournis à E2+ :** `PrismaModule`, `RedisModule`, `MailModule`, `ConfigModule`, design tokens, Docker services opérationnels.

## Notes

**Tracer bullet :** `GET /health` renvoie `{ status: "ok", db: "ok", redis: "ok" }` avec les trois services up — prouve NestJS, Prisma et Redis câblés bout en bout avant toute logique métier.

**Décisions cross-épics (spine, autoritatives) :**
- Modular monolith : pas de micro-services, pas d'import direct entre modules de domaine (AD-1, AD-2).
- `EventEmitter2` pour les effets de bord cross-domaine (AD-3).
- Interfaces TypeScript pour les appels synchrones cross-modules (AD-4).
- `nestjs-pino` obligatoire (AD-9).
- Validation Joi des variables d'env via `ConfigModule` (AD-10).
- Déploiement Systalink = processus NestJS unique (AD-11).
- `@nestjs/schedule` sera activé dans E5 (premier consommateur) — pas besoin de l'activer ici.

**Open question :** Quels secrets CI (Wave sandbox key, Cloudflare R2) doivent être provisionnés dès E1 vs E2/E5/E6 ? À régler avant la première story CI.

## References

- Initiative : `../initiative-afridev-hub-phase1.md`
- Spec CAP-1 : `../../spec-afridev-hub-phase1/spec-afridev-hub-phase1.md`
- Architecture spine : `../../architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md`
- AGENTS.md : `../../../AGENTS.md`
