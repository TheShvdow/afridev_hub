---
title: 'Offres d''emploi : liste fermée de pays et filtre par pays'
type: 'feature'
ticket: '1'
created: '2026-10-16'
status: done
baseline_revision: '06c343b8576c9eb9393806d69c9257678d1b1985'
route: 'oneshot'
route_source: 'pinned'
risk: 'low'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le pays d'une offre est un texte libre validé seulement par `^[A-Z]{2}$` : Swagger n'offre pas de liste, un code inexistant (`ZZ`) passe, et `GET /api/jobs` ne permet pas de filtrer par pays.

**Approach:** Une liste fermée de codes ISO 3166-1 alpha-2 (54 pays africains + principaux pays de la diaspora), partagée par la validation de création/modification, l'enum Swagger (liste déroulante) et un filtre optionnel `country` sur la liste des offres.

</frozen-after-approval>

## Implementation Notes

Route oneshot : changement localisé au module jobs (DTO, contrôleur, service) plus une constante commune, sans migration de schéma (`JobOffer.country` reste un `String`, l'index `(country, mode)` sert déjà le filtre).

- Liste dans `apps/api/src/common/countries.ts` (code → nom FR), pas dans `libs/shared-types` : l'API compilée ne résout pas l'alias `@afridev/shared-types` à l'exécution, seuls des imports de types y sont sûrs.
- Diaspora retenue : FR, BE, CH, LU, DE, IT, ES, PT, NL, GB, US, CA, BR, AE, QA (hypothèse, à ajuster par le PO).
- Filtre : code invalide → 400 ; casse ignorée (`sn` accepté et normalisé en `SN`).
- Revue : le pipe vérifie deux lettres ASCII avant `toUpperCase()` (`ß` devenait `SS`).
- Donnée existante : une offre en base a `country = "Dakar, Sénégal"` (créée avant la validation) ; le filtre `SN` ne la trouve pas tant qu'elle n'est pas corrigée. Pas de correction de données dans ce changement.

## Verification

**Commands:**
- `npx jest -c apps/api/jest.config.ts apps/api/src/jobs apps/api/src/common/countries apps/api/src/common/pipes` -- expected: verts (filtre service, DTO, pipe, liste)
- Swagger déployé (`/api/docs-json`) -- expected: `country` en enum sur `POST /api/jobs` et en query optionnelle enum sur `GET /api/jobs`

## Review Triage Log

- medium (defer) — contrat de données non mis à jour (`data-contract-afridev-hub-phase1.md` l. 36-37, 95, écarts l. 158-161) : la règle `country` et le filtre `GET /jobs?country=` y manquent ; édition de spec reportée dans `deferred-work.md`.
- low (patch) — `ß` passait en `SS` (Soudan du Sud) via `toUpperCase()` ; corrigé par un contrôle deux lettres ASCII, cas ajoutés au spec du pipe.
- low (rejeté) — branchement `@Query('country', OptionalCountryCodePipe)` non couvert par un test : vérifié en HTTP par le relecteur ; un test d'intégration dépasse une correction simple. Commande de vérification du plan élargie aux specs `common`.
