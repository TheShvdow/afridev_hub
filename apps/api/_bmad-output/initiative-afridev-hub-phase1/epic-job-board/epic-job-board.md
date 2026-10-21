---
type: epic
title: Job Board
parent: ../initiative-afridev-hub-phase1.md
covers: ["CAP-5"]
created: 2026-10-13
---

# Job Board

Offre un tableau d'offres d'emploi avec salaires affichés en devise locale, candidature en un clic avec CV PDF, alertes emploi par email, et expiration automatique des offres. Les recruteurs publient des offres et reçoivent les candidatures ; les membres candidatent sans double soumission. Le `CurrencyService` (ExchangeRate-API, refresh quotidien) et `@nestjs/schedule` sont activés ici pour la première fois.

## Outcome

Job board opérationnel avec salaires en devise locale, upload CV PDF via R2, candidatures dédupliquées, expiration automatique des offres, alertes job in-app et email, et `CurrencyService` disponible pour E6. Déployé en production Systalink.

## Done when

- Un recruteur (profil recruteur activé, décision 2026-10-21) peut soumettre une offre, publiée après validation par la modération, avec salaire min/max + devise locale ; le salaire est affiché en devise locale sans conversion forcée.
- Un membre peut candidater (upload CV PDF via R2) ; double soumission sur la même offre est bloquée (HTTP 409).
- Le recruteur reçoit un email de notification à chaque candidature reçue.
- Les offres expirées n'apparaissent plus dans les résultats de recherche (expiration automatique via `@nestjs/schedule`).
- `CurrencyService` opérationnel : taux ExchangeRate-API rafraîchis quotidiennement via scheduler.
- SM-5 mesurable : compteur d'offres publiées avec salaire dans dashboard/admin.
- Alertes emploi : un membre peut s'abonner à des critères (technologie, lieu) et reçoit une notification in-app + email quand une offre correspondante est publiée (via `NotificationsModule`).
- Déployé en production Systalink.

## Boundaries

**In scope :** CRUD offres emploi (recruteur), candidature avec CV PDF, déduplication candidatures, expiration automatique, alertes emploi (in-app + email), `CurrencyService` (ExchangeRate-API, quotidien), `@nestjs/schedule` activation, `UploadModule` extension (CV PDF, contraintes MIME application/pdf, taille max 5 MB).

**Out of scope :** paiement plan recruteur premium (FR-34 — déclenché ici comme trigger, traité dans E6), messagerie directe candidat-recruteur (Phase 2), ATS intégration (Phase 2), notation/avis recruteur (Phase 2).

**Touch points consommés :**
- `User entity` + rôle RECRUITER + `JWT guards` (E2)
- `UploadModule` R2 (E2) — extension pour CV PDF (MIME + taille)
- `NotificationsModule` (E2) — alertes emploi (events `job.alert`)
- `@nestjs/schedule` — activé dans cet épic (premier consommateur)

**Touch points fournis à E6 :**
- Entité Job + rôle RECRUITER opérationnel
- `plan premium trigger` (FR-34) : event ou flag indiquant qu'un recruteur doit souscrire un plan payant

**`CurrencyService` fourni à :** pas de consommateur en Phase 1 au-delà du job board lui-même (E6 peut le réutiliser pour afficher les montants de paiement).

## Notes

**Tracer bullet :** recruteur publie offre avec salaire en FCFA → membre candidature avec CV PDF → recruteur reçoit email — prouve RECRUITER role, upload R2 PDF, email via MailModule, en une session.

**Décision :** `@nestjs/schedule` activé dans E5, pas dans E1 (premier consommateur ici). Si E4 a besoin du scheduler avant E5, revoir l'ordre.

**Décisions 2026-10-21 :**
- Recruteur = Membre qui active un profil recruteur (`POST /users/me/recruiter`, `isRecruiter` + `companyName`). Pas de rôle RECRUITER : le rôle MEMBER/MODERATOR/ADMIN reste indépendant.
- FR-28 : toutes les offres passent par la validation d'un modérateur (`PENDING_REVIEW` → `ACTIVE` ou `REJECTED`). Les 60 jours partent de la validation.
- FR-32 : notification in-app immédiate à la publication d'une offre correspondante, et email récapitulatif chaque lundi.
- FR-30 : taux open.er-api.com (sans clé), rafraîchis chaque nuit ; derniers taux conservés si la source tombe. Devise préférée sur le profil (`preferredCurrency`).
- FR-34 : le déclencheur est le quota (3 offres par mois calendaire en gratuit, puis 402 `JOBS_PLAN_LIMIT_REACHED`). Le passage premium (paiement Bictorys, `RecruiterPlan`) est traité dans E6.
- CV : jamais d'URL publique ; le recruteur reçoit un lien signé de 10 minutes.

**État 2026-10-21 :** backend E5 livré sur la branche `feat/e5-job-board`. Le front Angular reste à faire, ainsi que l'activation du plan premium (E6).

## References

- Initiative : `../initiative-afridev-hub-phase1.md`
- Spec CAP-5 : `../../spec-afridev-hub-phase1/spec-afridev-hub-phase1.md`
- Architecture spine (AD-6, AD-8) : `../../architecture-afridev-hub-phase1/architecture-afridev-hub-phase1.md`
- AGENTS.md : `../../../AGENTS.md`
