---
name: glossary
description: Termes métier canoniques d'AfriDev Hub Phase 1 — à lire pour lever toute ambiguïté dans spec, spine et tickets.
---

# Glossaire — AfriDev Hub Phase 1

**AfriDev Hub** — Plateforme communautaire pour développeurs d'Afrique sub-saharienne, objet de cette spec.

**Question** — Publication dans le Forum Q&A : titre (≥ 15 chars), corps Markdown (≥ 50 chars), 1 à 5 tags. Unité de base de la connaissance partagée.

**Réponse** — Contribution Markdown (≥ 30 chars) en réponse à une Question. L'auteur de la Question ne peut pas répondre à sa propre Question.

**Vote** — Action up (+1) ou down (−1) sur une Question ou Réponse, réservée aux Membres avec Réputation ≥ 10. Un Membre ne vote pas sur son propre contenu. Second clic annule le vote (toggle).

**Réponse acceptée** — Réponse marquée par l'auteur de la Question comme résolvant son problème. Une seule par Question. L'auteur de la Réponse gagne +15 pts de Réputation.

**Réputation** — Score numérique par Membre, calculé par GamificationModule (seul module autorisé à écrire `User.reputation`). Règles Phase 1 : question posée (+5), réponse donnée (+10), upvote reçu (+10), downvote reçu (−2), réponse acceptée (+15). Gouverne les privilèges (votes ≥ 10).

**Membre** — Utilisateur avec compte confirmé (email ou OAuth GitHub/Google). Rôles : MEMBER (défaut), MODERATOR, ADMIN.

**Modérateur** — Membre avec droits de modération (queue signalements, masquage/restauration de contenus).

**Recruteur** — Membre avec profil entreprise pouvant publier des Offres. Freemium : 3 offres/mois. Premium (25 000 FCFA/mois) : illimité + profils complets.

**Mentor** — Membre senior (profil vérifié, ≥ 3 ans déclarés), validé manuellement par un admin. **Phase 2 uniquement.**

**Projet** — Réalisation logicielle soumise dans la Vitrine Projets : lien GitHub, description (≥ 50 chars), stack (1-5 tags), catégorie, pays.

**Offre** — Publication dans le Job Board : titre, description Markdown, stack (1-5 tags), pays, mode (remote/onsite/hybride), salaire obligatoire (montant + devise locale). Expire à J60.

**PaymentProvider** — Interface abstraite (`initiate`, `capture`, `refund`, `getStatus`) implémentée par Wave, Orange Money, Stripe. Résolution via `PaymentProviderFactory` dans `PaymentsModule`.

**Wave** — Opérateur de paiement mobile (Sénégal, Côte d'Ivoire). Flow : `initiate` → lien Wave → paiement utilisateur → webhook → `capture`. Timeout : 15 min.

**Orange Money** — Opérateur de paiement mobile (Sénégal, Côte d'Ivoire, Mali). Flow identique à Wave. Phase 1 si sandbox confirmé avant S7.

**Stripe** — Opérateur international (carte Visa/Mastercard). Fallback si opérateur mobile indisponible.

**Webhook de paiement** — Notification HTTP émise par l'opérateur. Traitement idempotent obligatoire : idempotency key stockée en PostgreSQL ; doublon retourne HTTP 200 sans retraitement.

**Badge vérifié** — Attribué automatiquement quand 5 conditions sont remplies simultanément : email confirmé + pays renseigné + stack renseignée + bio ≥ 50 chars + ≥ 1 lien externe. Retiré dès qu'une condition est invalidée.

**Phase 1** — Sprints S1–S16 (16 semaines) : Infrastructure + Auth + Forum + Vitrine + Job Board + Paiements (Wave + Stripe; Orange Money si sandbox disponible). Cible : bêta fermée à S17.

**Phase 2** — Après S17 : Mentorat 1-to-1 (FR-41–49), PWA & Offline-First (FR-50–57), Groupes & Communautés (FR-58–62).

**Systalink** — Plateforme de déploiement cible Phase 1. Backend NestJS déployé comme processus Node.js unique (PM2). Dépendances externes provisionnées séparément.

**GamificationModule** — Module NestJS seul autorisé à écrire `User.reputation`. Les autres modules (forum, votes, users) lisent ce champ en lecture seule via join Prisma.

**NotificationsGateway** — Gateway Socket.io maintenant un `Map<userId, Socket>` in-memory (Phase 1, mono-instance). Seul consommateur Socket.io ; les autres modules émettent via EventEmitter2.

**Story Point** — Unité d'estimation (suite Fibonacci : 1, 2, 3, 5, 8, 13). Vélocité Phase 1 : 20 pts/sprint.
