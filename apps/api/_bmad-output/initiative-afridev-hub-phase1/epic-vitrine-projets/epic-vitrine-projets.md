---
type: epic
title: Vitrine Projets
parent: ../initiative-afridev-hub-phase1.md
covers: ["CAP-4"]
created: 2026-10-13
---

# Vitrine Projets

Permet aux membres vérifiés de soumettre leurs projets open-source, d'importer automatiquement les stats GitHub (stars, forks, langue, dernière activité) et de les présenter sur une page publique partageable. Les visiteurs peuvent filtrer les projets par technologie, type ou popularité via des URL partageables.

## Outcome

Répertoire public de projets open-source africains avec stats GitHub live, pages projet avec OG meta, filtres combinables par URL, et au moins 5 projets soumis avec stats importées comme signal de succès à la bêta.

## Done when

- Un membre avec badge vérifié peut soumettre un projet (URL GitHub requise) ; les stats (stars, forks, langue, last push) sont importées automatiquement à la soumission.
- Page projet publique avec OG meta (og:title, og:image, og:description) consommable par les crawlers et réseaux sociaux.
- Filtres combinables (technologie, type, tri popularité/activité) produisent des URL partageables (query params).
- Rafraîchissement des stats GitHub planifié (manuel ou schedulé — à préciser lors de l'inception).
- SM-6 mesurable : compteur de projets soumis avec stats GitHub importées dans le dashboard/admin.
- Déployé en production Systalink.

## Boundaries

**In scope :** soumission projet (URL GitHub, description, tags techno), import stats GitHub (stars, forks, langue, last push via GitHub API public), page projet publique, liste projets avec filtres/tri, OG meta, badge vérifié requis pour soumettre.

**Out of scope :** étoiles internes (votes sur projets) Phase 1 — n'affectent pas `reputation` ; import d'autres forges (GitLab, Bitbucket) Phase 2 ; co-auteurs multiples Phase 2 ; commentaires sur projets Phase 2.

**Touch points consommés :**
- `JWT guards` + `User entity` + badge vérifié (E2) — condition de soumission
- Design tokens + composants (E1) — UI cards projets

**Touch points non consommés ici :** `GamificationModule` non touché (étoiles projet hors scope réputation Phase 1), `NotificationsModule` non touché.

## Notes

**Tracer bullet :** soumettre un projet GitHub → stats importées → `GET /projects/:slug` retourne la page avec stars/forks/langue — prouve l'appel GitHub API, le stockage Prisma et le rendu public en une session.

**Décision :** Les étoiles internes de projet N'alimentent PAS `reputation` en Phase 1 (glossaire exhaustif des règles réputation). E4 peut donc tourner en parallèle avec E3 sans collision sur GamificationModule. Cette décision doit être confirmée avant l'inception E4 si la spec évolue.

**Décisions 2026-10-21 :**
- Pas d'approbation manuelle : badge « dev vérifié » requis, lien `https://github.com/<compte>/<dépôt>` vérifié auprès de l'API GitHub (introuvable ou privé → 422), un dépôt ne figure qu'une fois, catégorie obligatoire. Le projet est publié tout de suite ; les signalements et le masquage d'E3 servent de filet. La colonne `isApproved` est supprimée.
- Stats GitHub (étoiles, forks, langage, dernier push) importées à la soumission. Si GitHub est indisponible, le projet est publié sans stats. Rafraîchissement chaque nuit à 3 h, et à la demande de l'auteur une fois par heure. `GITHUB_API_TOKEN` (optionnel) relève la limite de 60 à 5 000 requêtes/heure.
- URL publique `/projects/<slug>` ; les anciens liens par identifiant restent valides. Image Open Graph : carte générée par GitHub pour le dépôt.
- « Type » de projet = catégorie. Tris : récents, étoiles GitHub, étoiles AfriDev Hub, dernier push.

**État 2026-10-21 :** backend E4 livré sur la branche `feat/e4-projects`. Le front Angular reste à faire (page projet en SSR pour les balises OG).

## References

- Initiative : `../initiative-afridev-hub-phase1.md`
- Spec CAP-4 : `../../spec-afridev-hub-phase1/spec-afridev-hub-phase1.md`
- Architecture spine : `../../architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md`
- AGENTS.md : `../../../AGENTS.md`
