---
name: data-contract-afridev-hub-phase1
description: Contrat de données unifié — schéma Prisma, DTO d'entrée, types partagés et règles métier. À consulter avant tout ajout de champ, DTO ou enum.
metadata:
  type: architecture
  status: adopted
  updated: 2026-10-14
---

# Contrat de données — AfriDev Hub Phase 1

## 1. Hiérarchie des sources

Quand deux sources divergent, on corrige la source du bas vers le haut, jamais en laissant l'écart.

| Niveau | Source | Fait foi pour |
| --- | --- | --- |
| 1 | Glossaire et spine (`spec/glossary.md`, `architecture/…md`) | Règles métier (longueurs, quotas, délais) |
| 2 | `prisma/schema.prisma` | Noms de champs, types, enums, relations, contraintes de base |
| 3 | DTO (`apps/api/src/**/dto/*.ts`) | Validation des entrées API (class-validator) |
| 4 | `libs/shared-types/src/index.ts` | Types consommés par le front et les événements |

Les enums des niveaux 2 à 4 sont **identiques** : les DTO importent les enums depuis `@prisma/client`, `libs/shared-types` les redéclare en littéraux (vérifié : 15 enums, 0 écart).

## 2. Enums

| Enum Prisma | Valeurs | DTO | Type partagé |
| --- | --- | --- | --- |
| `UserRole` | MEMBER, MODERATOR, ADMIN | admin `UpdateRoleDto.role` | `UserRole` |
| `VoteEntityType` | POST, ANSWER | déduit de la route `/votes/posts\|answers/:id` | `VoteEntityType` |
| `VoteValue` | UP, DOWN | `VoteDto.value` | `VoteValue` |
| `ReportEntityType` | POST, ANSWER, PROJECT | `CreateReportDto.entityType` | `ReportEntityType` |
| `ReportStatus` | PENDING, REVIEWED, RESOLVED, DISMISSED | — | `ReportStatus` |
| `ModerationActionType` | HIDDEN, RESTORED, DISMISSED, WARNING, BAN | `ResolveReportDto.action` (HIDDEN, RESTORED, WARNING) | `ModerationActionType` |
| `ExperienceLevel` | JUNIOR, MID, SENIOR | `OnboardingDto.level`, `UpdateUserDto.level` | `ExperienceLevel` |
| `JobType` | FULL_TIME, PART_TIME, CONTRACT, FREELANCE, INTERNSHIP | `CreateJobDto.type`, filtre `GET /jobs?type=` | `JobType` |
| `JobMode` | REMOTE, ONSITE, HYBRID | `CreateJobDto.mode`, filtre `GET /jobs?mode=` | `JobMode` |
| `JobStatus` | ACTIVE, EXPIRED, CLOSED | — | `JobStatus` |
| `ApplicationStatus` | PENDING, REVIEWED, ACCEPTED, REJECTED | — | `ApplicationStatus` |
| `PlanType` | FREE, PREMIUM | — | `PlanType` |
| `PaymentProvider` | BICTORYS (agrégateur unique, migration `20261014130000`) | `InitiatePaymentDto.paymentType` (moyen) + `country` ; le fournisseur est BICTORYS | `PaymentProvider` |
| `PaymentStatus` | PENDING, AUTHORIZED, CAPTURED, FAILED, REFUNDED | — | `PaymentStatus` |
| `PaymentEntityType` | MENTOR_SESSION, RECRUITER_PLAN, COURSE_ENROLLMENT | `InitiatePaymentDto.entityType` | `PaymentEntityType` |
| `RefundStatus` | PENDING, PROCESSED, REJECTED | — | `RefundStatus` |
| `NotificationType` | NEW_ANSWER, ANSWER_ACCEPTED, VOTE_RECEIVED, MENTION, REPORT_RESOLVED, JOB_ALERT, SYSTEM, BADGE_AWARDED | — | `NotificationType` |

## 3. Entrées API — DTO ↔ schéma ↔ règle

Les contraintes de longueur viennent du glossaire quand il en définit une ; sinon elles sont celles du DTO existant.

### Authentification
| DTO | Champ | Colonne Prisma | Contrainte |
| --- | --- | --- | --- |
| `RegisterDto` | username | `User.username` (unique) | 3–30 car., `[a-zA-Z0-9_-]` |
| | email | `User.email` (unique) | email valide |
| | password | `User.passwordHash` | ≥ 8 car., 1 majuscule, 1 minuscule, 1 chiffre |
| `LoginDto` | email, password | — | idem |
| Refresh (`RefreshAuthGuard`) | refreshToken (body) | — | JWT valide + révocation Redis |

### Profil
| DTO | Champ | Colonne Prisma | Contrainte |
| --- | --- | --- | --- |
| `UpdateUserDto` | displayName | `User.displayName` | ≤ 60 |
| | bio | `User.bio` | ≤ 500 |
| | location | `User.location` | ≤ 100 |
| | websiteUrl | `User.websiteUrl` | URL |
| | githubUsername / linkedinUsername / twitterUsername | `User.*Username` | ≤ 39 / ≤ 100 / ≤ 50 |

### Forum
| DTO | Champ | Colonne Prisma | Contrainte | Source |
| --- | --- | --- | --- | --- |
| `CreatePostDto` | title | `Post.title` | 15–200 | Glossaire « Question » |
| | body | `Post.body` (Text) | 50–50 000 | Glossaire « Question » |
| | tags | `PostTag` → `Tag` | **requis**, 1–5 | Glossaire « Question » |
| `CreateAnswerDto` | body | `Answer.body` (Text) | 30–50 000 | Glossaire « Réponse » |
| `VoteDto` | value | `Vote.value` (`VoteValue`) | UP \| DOWN | Glossaire « Vote » (+1 / −1) |

### Projets
| DTO | Champ | Colonne Prisma | Contrainte | Source |
| --- | --- | --- | --- | --- |
| `CreateProjectDto` | name | `Project.name` | 5–120 | — |
| | description | `Project.description` (Text) | 50–10 000 | Glossaire « Projet » |
| | country | `Project.country` (défaut `SN` pour les lignes existantes) | **requis**, ISO 3166-1 alpha-2 | Glossaire « Projet » (pays) |
| | repoUrl | `Project.repoUrl` | **requis**, URL | Glossaire « Projet » (lien GitHub) |
| | demoUrl | `Project.demoUrl` | optionnel, URL | — |
| | tags | `ProjectTag` → `Tag` | **requis**, 1–5 | Glossaire « Projet » (stack 1–5) |
| | categorySlug | `Project.categoryId` (via `ProjectCategory.slug`) | optionnel ; slug inconnu → 400 | — |

### Offres d'emploi
| DTO | Champ | Colonne Prisma | Contrainte | Source |
| --- | --- | --- | --- | --- |
| `CreateJobDto` | title | `JobOffer.title` | 5–120 | — |
| | description | `JobOffer.description` (Text) | 100–20 000 | — |
| | company | `JobOffer.company` | ≤ 100 | — |
| | country | `JobOffer.country` | **requis**, ISO 3166-1 alpha-2 (ex. `SN`) | Glossaire « Offre » (pays) |
| | type | `JobOffer.type` (`JobType`, défaut `FULL_TIME` pour les lignes existantes) | **requis** | Décision 2026-10-14 (type de contrat conservé) |
| | mode | `JobOffer.mode` (`JobMode`) | **requis** | Glossaire « Offre » (remote/onsite/hybride) |
| | salaryMin / salaryMax | `JobOffer.salaryMin/Max` (Int) | **requis**, entiers > 0, min ≤ max | Glossaire « Offre » (salaire obligatoire) |
| | currency | `JobOffer.currency` | **requis**, ISO 4217 (ex. `XOF`) | Glossaire « Offre » |
| | stack | `JobOffer.stack` (String[]) | **requis**, 1–5 | Glossaire « Offre » |
| | — | `JobOffer.expiresAt` | calculé : now + 60 jours | Glossaire « Offre » (J60) |
| `ApplyJobDto` | message | `JobApplication.message` | **requis** | — |
| | cvKey | `JobApplication.cvUrl` (contient la clé R2, pas une URL) | optionnel, clé `cvs/<userId>/<uuid>.pdf` vérifiée dans R2 | FR-31 |
| `CreateJobAlertDto` | country, mode, stack, salaryMin, currency | `JobAlert.*` | tous optionnels ; currency requis avec salaryMin ; 5 alertes max | FR-32 |
| `RecruiterProfileDto` | companyName | `User.companyName` (+ `User.isRecruiter = true`) | 2–100 | Glossaire « Recruteur » |

### Modération, administration, paiements
| DTO | Champ | Colonne Prisma | Contrainte |
| --- | --- | --- | --- |
| `UpdateRoleDto` (admin) | role | `User.role` | `UserRole` |
| `CreateReportDto` | entityType | `Report.entityType` | `ReportEntityType` |
| | entityId | `Report.entityId` | string ; le contenu doit exister (`MODERATION_TARGET_NOT_FOUND`) |
| | reason, details | `Report.reason` (`RAISON` ou `RAISON : détails`) | reason ∈ SPAM, OFFENSIVE, OFF_TOPIC, DUPLICATE, OTHER ; details ≤ 500, optionnel |
| `ResolveReportDto` | action | `ModerationAction.action` | HIDDEN, RESTORED ou WARNING |
| | note | `ModerationAction.note` | ≤ 1 000 |
| `BanUserDto` | userId, reason | `ModerationAction` | reason 3–500 |
| `InitiatePaymentDto` | amount | `Payment.amount` (Int) | entier > 0, unité de base |
| | currency | `Payment.currency` | ISO 4217 |
| | provider | `Payment.provider` | `PaymentProvider` |
| | entityType, entityId | `Payment.entityType`, `Payment.entityId` | `PaymentEntityType` ; string |

## 4. Vues de sortie — types partagés ↔ modèles Prisma

Les relations gardent le nom Prisma (`user`, `postTags`, `projectTags`, `recruiter`, `actor`).

| Type partagé | Source Prisma (`select` / `include`) |
| --- | --- |
| `UserSummary` | `User` : id, username, displayName, avatarUrl, reputation |
| `UserMe` | `User` (`GET /auth/me`) |
| `UserProfile` | `User` (profil public) |
| `PostListItem` | `Post` : id, title, viewCount, isResolved, createdAt + user, postTags, `_count.answers` |
| `PostDetail` | `PostListItem` + body + answers |
| `AnswerItem` | `Answer` : id, body, isAccepted, createdAt + user |
| `ProjectListItem` | `Project` : id, name, description, repoUrl, demoUrl, isApproved, createdAt + user, projectTags, `_count.stars` |
| `JobListItem` | `JobOffer` : id, title, company, country, mode, stack, status, salaryMin/Max, currency, expiresAt, createdAt + recruiter |
| `JobApplicationItem` | `JobApplication` : id, message, cvUrl, status, createdAt + user |
| `PaymentItem` | `Payment` (sans metadata) |
| `NotificationItem` | `Notification` + actor |

## 5. Décisions

- (decision) **Le schéma Prisma est la source des champs et des enums.** Les DTO et les types partagés s'alignent dessus.
- (decision) **Identifiants UUID v4** (`@default(uuid())`), confirmé le 2026-10-14. Les lignes existantes gardent leur identifiant `cuid` (simple chaîne, pas de migration de données).
- (decision) **Type de contrat d'offre conservé** (`JobType`, confirmé le 2026-10-14). Défaut `FULL_TIME` pour les lignes existantes.
- (decision) **Pays du projet ajouté** (`Project.country`, ISO alpha-2, requis dans l'API). Défaut `SN` posé pour les lignes existantes : **à confirmer**, c'est une hypothèse sur les données.
- (decision) **Stack projet = tags** : `Project` n'a pas de champ `stack` ; les technologies passent par `ProjectTag`. Le DTO s'appelle `tags`.
- (decision) **Stack offre = `stack`** : `JobOffer.stack` est un `String[]`.
- (decision) **Votes : enum `UP` / `DOWN`** dans l'API, convertis en +1 / −1 dans `VotesController`. Règle de réputation : +10 pour un vote reçu, −2 pour un vote négatif reçu (glossaire).
- (decision) **Niveau d'expérience** `User.level` (JUNIOR, MID, SENIOR), déclaré à l'onboarding et modifiable par le profil. Valeurs choisies par le mainteneur à défaut de définition dans le glossaire.
- (decision) **Réputation = `User.reputation`**. Seul `GamificationModule` l'écrit (spine AD-2). Les autres modules émettent des événements : `forum.question.created` (+5), `forum.answer.created` (+10), `forum.answer.accepted` (+15 à l'auteur de la réponse), `votes.vote.changed` (delta calculé avant/après : ajout, changement, annulation).
- (decision) **Voter exige une réputation ≥ 10** (glossaire), contrôlé dans `VotesService` (`VOTES_REPUTATION_TOO_LOW`).
- (decision) **Enveloppe AD-7 implémentée** : succès `{ data }` (les listes gardent `{ data, meta }`), erreur `{ error: { code, message, details? } }`. Codes au format `DOMAINE_ENTITE_RAISON`, listés dans `libs/shared-types`. Erreur non prévue : `COMMON_INTERNAL_ERROR`, détail journalisé, jamais renvoyé au client.
- (decision) **Migrations Prisma avec historique** (remplace `db push`, décision 2026-10-14). Dossier `prisma/migrations/`, verrou `migration_lock.toml`. Baseline `20261014120000_init` (schéma initial), puis `20261014120100_job_type_project_country`. La base dev, créée sans historique, a été marquée à jour avec `migrate resolve --applied`. Règle : aucun `db push` sur une base partagée ; tout changement de schéma passe par `prisma migrate dev` puis commit du dossier de migration.
- (decision) **Agrégateur de paiement : Bictorys**, implémenté (commit `48a1f52`). `IPaymentProvider` avec une implémentation. Le schéma ne garde que `BICTORYS`. Source de vérité : la documentation Bictorys, consignée dans `bictorys-integration-notes.md`.
- (decision) **Forum E3 (2026-10-20)** : migration `20261020120000_forum_e3_votes_search_moderation`.
  - `Post.voteScore` et `Answer.voteScore` (votes positifs − négatifs) sont tenus à jour par `ForumListener` sur `votes.vote.changed`. `Post.lastActivityAt` change à chaque réponse, acceptation ou modification. Ils servent aux tris `votes` et `active`.
  - Recherche plein texte en français, accents ignorés : index d'expression GIN sur `to_tsvector('french', f_unaccent(title || ' ' || body))`, interrogé par `$queryRaw`. Détection de doublons (FR-14) : index trigramme sur `lower(f_unaccent(title))`, seuil de similarité 0.6. Ces index ne sont pas dans `schema.prisma` ; `prisma migrate diff` ne propose pas de les supprimer (vérifié).
  - `isHidden` et `hiddenAt` sur Post, Answer et Project. Un contenu masqué disparaît des listes et de la recherche ; au détail, titre et corps valent « [Contenu masqué] », sauf pour MODERATOR et ADMIN.
  - Un signalement par membre et par contenu (`@@unique`, 409 `MODERATION_REPORT_DUPLICATE`). **Seuil d'auto-masquage : 3 signalements ouverts** (décision du 2026-10-20), réglable par `MODERATION_AUTO_HIDE_THRESHOLD`. L'action automatique a `moderatorId` à null.
  - Résoudre ou ignorer un signalement clôt tous les signalements ouverts du même contenu. Ignorer rend le contenu visible. Chaque décision est écrite dans `AuditLog`.
  - Notifications FR-18 (nouvelle réponse, réponse acceptée, nouveau vote positif) en in-app et par email, sauf si `User.emailNotifications` vaut false.
  - Les commentaires sont reportés en phase 2 (absents du PRD, décision du 2026-10-20).
- (decision) **Job board E5 (2026-10-21)** : migrations `20261021120000_job_board_e5_enums`, `20261021120100_job_board_e5`, `20261021120200_job_stack_lowercase`.
  - Cycle d'une offre : `PENDING_REVIEW` → `ACTIVE` (validation, `publishedAt`, expiration à +60 jours) ou `REJECTED` (`rejectionReason`). Une offre refusée puis modifiée repart en `PENDING_REVIEW`. `ACTIVE` → `EXPIRED` (tâche horaire) ou `CLOSED`. Une offre active ou expirée se renouvelle pour 60 jours.
  - `salaryMinUsd` / `salaryMaxUsd` : salaires convertis en USD, recalculés à chaque mise à jour des taux, pour le filtre salaire entre devises.
  - Quota du plan gratuit : 3 offres par mois calendaire UTC, offres refusées exclues. Plan premium = `RecruiterPlan` PREMIUM actif et non expiré.
  - Les technologies (`JobOffer.stack`, `JobAlert.stack`) sont stockées en minuscules.
  - Événements : `jobs.offer.published`, `jobs.offer.reviewed`, `jobs.application.created`, `jobs.alert.matched`, `currency.rates.updated`.
- (decision) **Vitrine projets E4 (2026-10-21)** : migration `20261021130000_projects_e4`.
  - `Project.isApproved` supprimé : publication immédiate si badge vérifié et dépôt GitHub existant. Les projets existants non approuvés deviennent visibles.
  - `Project.slug` unique (tiré du nom, suffixe aléatoire court en cas de collision), `githubFullName` (« owner/repo » en minuscules, un projet par dépôt), `githubForks`, `githubSyncedAt` (dernier import réussi ; null = pas encore importé).
  - `CreateProjectDto.categorySlug` devient obligatoire (FR-22) ; `UpdateProjectDto` accepte les tags, la catégorie et un nouveau dépôt (revérifié, stats remplacées).
- (decision) **Paiements E6 (2026-10-21)** : `InitiatePaymentDto` ne contient plus que `product`, `paymentType`, `country`, `customer`. Montant, devise, `entityType` et `entityId` (= le membre qui paie) viennent de `payments/catalog.ts`. Pas de migration : le produit est rangé dans `Payment.metadata.product`. Un paiement `CAPTURED` de type `RECRUITER_PLAN` crée ou prolonge `RecruiterPlan` (PREMIUM, +30 jours) dans la même transaction.
- (decision) **Vérification d'email par code (2026-10-21)** : le lien est remplacé par un code de 6 caractères (lettres majuscules et chiffres, sans 0/O/1/I), unique parmi les codes en cours, valable 24 h. `VerificationToken.token` contient l'empreinte SHA-256 du code, jamais le code. `POST /auth/verify-email` exige la connexion (JWT reçu à l'inscription) et prend `{ code }`, casse ignorée. 5 essais erronés invalident le code (429 `AUTH_VERIFICATION_TOO_MANY_ATTEMPTS`) ; `POST /auth/resend-verification` en envoie un nouveau. Migration `20261021150000_email_verification_code` : colonne `attempts`, anciens liens supprimés.
- (decision) **Table des pays (2026-10-22)** : table `Country` (`code` ISO alpha-2 en clé, `alpha3`, `name` en français, `region` AFRICA ou DIASPORA), 69 pays : les 54 pays africains et 15 de la diaspora. `User.country`, `JobOffer.country` et `Project.country` sont des clés étrangères vers `Country.code` : la base refuse un code inconnu. Le front précharge `GET /api/countries` (public, mis en cache 24 h) pour ses listes déroulantes et envoie le code à 2 lettres. Source unique : `apps/api/src/common/countries.ts`, utilisée par la migration `20261022120000_country_table`, le seed et la validation des DTO (casse ignorée, `sn` → `SN`).
- (decision) **Nettoyage du schéma (2026-10-22)** : migration `20261022130000_drop_unused_tables`. Supprimés car jamais utilisés par le code et vides : tables `JobCategory` (et `JobOffer.categoryId`) et `Refund` (et l'enum `RefundStatus`, remboursements en phase 2) ; colonnes `User.name`, `User.githubUrl`, `User.linkedinUrl` (doublons de `displayName`, `githubUsername`, `linkedinUsername`) ; colonnes de jetons de `Account` (`accessToken`, `refreshToken`, `expiresAt`, `tokenType`, `scope`, `idToken`) : l'API ne conserve pas les jetons des fournisseurs OAuth.
- (decision) **Vérification avant connexion (2026-10-22)**, remplace en partie la décision du 2026-10-21 : `POST /auth/register` crée le compte avec `isVerified: false`, envoie le code et renvoie `{ message, email }`, sans access ni refresh token. `POST /auth/verify-email` est public et prend `{ email, code }` ; un email inconnu reçoit la même erreur qu'un code faux. `POST /auth/resend-verification` est public, prend `{ email }` et répond pareil quel que soit l'email. Tant que l'email n'est pas vérifié, `login`, `refresh`, la connexion OAuth et toute route protégée par JWT répondent 403 `AUTH_EMAIL_NOT_VERIFIED`. Parcours du front : inscription, page de vérification du code, puis page de connexion. Exceptions : un compte créé par Google ou GitHub avec un email confirmé par le fournisseur est vérifié d'office ; une liaison OAuth confirmée par le mot de passe vérifie le compte si le fournisseur a confirmé l'email.
- (decision) **Build API : `rootDir` = racine du monorepo** (`apps/api/project.json`), pour que l'API puisse importer `libs/shared-types`. `outputFileName` fixé pour que `nx serve` retrouve `main.js`.

## 6. Écarts connus

| # | Écart | Où | Statut |
| --- | --- | --- | --- |
| E1 | Pays du projet absent du modèle. | schéma | **Résolu** : `Project.country` ajouté (migration). |
| E2 | Règle « voter avec réputation ≥ 10 » non appliquée. | `votes.service.ts` | **Résolu** : contrôle `VOTES_REPUTATION_TOO_LOW`. |
| E3 | Enveloppe AD-7 non implémentée. | intercepteur, filtre | **Résolu** : `ResponseInterceptor`, `AllExceptionsFilter`, codes typés. |
| E4 | `GET /projects?category=` non appliqué. | `projects.service.ts` | **Résolu** : filtre `category.slug`. |
| E5 | Le front envoie `POST /auth/refresh` avec `{}`. | `apps/web/.../auth.service.ts` | **Ouvert** — front hors périmètre pour l'instant (décision utilisateur). L'API exige `refreshToken`. |
| E6 | `update`, `close`, `delete` présents dans les services, non exposés. | `jobs`, `projects` | **Résolu** : `PATCH /jobs/:id`, `PATCH /jobs/:id/close`, `PATCH /projects/:id`, `DELETE /projects/:id` (auteur, ou modérateur et admin pour la suppression). |
| E7 | `upsertTags` dupliqué entre forum et projets. | `forum.service.ts`, `projects.service.ts` | **Résolu** : helper commun `resolveTagIds` ; copie morte supprimée. |
| E8 | `ModerationAction.entityType` était une chaîne libre. | schéma, `moderation.service.ts` | **Résolu** : enum `ModerationTargetType` (POST, ANSWER, PROJECT, USER), migration `20261014140000`. Table vide au moment du passage. |
| E9 | `VotesService` écrivait la réputation. | `votes.service.ts` | **Résolu** : événement `votes.vote.changed`, écriture dans `gamification/`. |
| E10 | Règle « l'auteur d'une question ne peut pas y répondre » non appliquée. | `forum.service.ts` | **Résolu** : contrôle `FORUM_SELF_ANSWER_FORBIDDEN`, couvert par un test. |
| E11 | Le paquet `@nestjs/testing` installé n'avait pas ses fichiers `.d.ts`. | `node_modules` | **Résolu** : installation complète constatée ; `nx test api` passe (voir section 8 pour le nombre à jour). |
| E12 | Enum `PaymentProvider`, webhooks et service étaient écrits pour Wave, Orange Money, MTN MoMo et Stripe. | `schema.prisma`, `payments/` | **Résolu** pour le code (48a1f52). **Reste ouvert** : format du webhook et auth du remboursement à valider en sandbox (voir `bictorys-integration-notes.md`). |
| E13 | Réponse ≥ 30 caractères (glossaire) non vérifiée : `CreateAnswerDto` n'avait qu'un `MaxLength`. | `create-answer.dto.ts`, front | **Résolu** : `@MinLength(30)` (hérité par `UpdateAnswerDto`) et validateur du front sur le texte rogné. |
| E14 | Le front laissait les modérateurs ouvrir toutes les pages `/admin`, alors que `/admin/*` est réservé aux ADMIN. | `admin.routes.ts` | **Résolu** : seule la page des signalements (`/moderation/*`) reste ouverte aux modérateurs. |
| E15 | Messages anglais du framework (401, 403, 404) dans l'enveloppe AD-7. | `all-exceptions.filter.ts` | **Résolu** : traduits ; un message métier explicite est conservé. |

## 7. Vérification (2026-10-14)

- **Parité des enums** : `schema.prisma` ↔ `libs/shared-types` (script de comparaison) — à relancer après l'ajout de `JobType`.
- **Types** : `tsc --noEmit -p apps/api/tsconfig.app.json` → 0 erreur. Build `nx serve api` (watch) → « Found 0 errors ».
- **Migrations** : `prisma migrate status` → « Database schema is up to date » (2 migrations). Non vérifié : rejeu de la baseline sur une base vierge (shadow DB), à faire avant le premier déploiement.
- **Enveloppe AD-7** (instance locale) : succès `{ data }` ; erreur métier `AUTH_INVALID_CREDENTIALS` ; 404 de route `COMMON_NOT_FOUND` ; validation `COMMON_VALIDATION_FAILED` avec `details`.
- **Réputation** (scénario complet, historique vérifié) : question +5, réponse +10, vote reçu +10 annulé −10, vote négatif −2, acceptation +15 ; vote refusé à 5 points (403 `VOTES_REPUTATION_TOO_LOW`) ; auto-vote refusé. Solde final : auteur 3, répondant 25.
- **Tests unitaires** : `nx test api` → 2 suites, 10 tests, tous passent (Postgres et Redis démarrés).

## 8. Mise à jour (2026-10-15)

- **Tests** : `nx test api` → 23 suites, 126 tests passent. Le test e2e d'authentification et de profil (story E2-11) est lancé à part, sur une base dédiée `afridev_test` après `prisma migrate deploy` et `prisma:seed` : 2 tests passent. Sans le seed, le badge `dev-verifie` n'existe pas et le test échoue.
- **Lint** : configuré (`apps/api/.eslintrc.json`), 0 erreur et 0 avertissement. Le constat « lint impossible » de la story 10 est obsolète.
- **Documentation API** : toutes les routes de gamification, admin, paiements et modération sont décrites avec l'enveloppe AD-7 dans Swagger.
- **Avatars** : `PATCH /api/users/me/avatar` prend la clé de l'objet et vérifie sa présence dans R2 (`HeadObject`). Le téléversement multipart est retiré.
- **Paiements** : confirmation par l'API de statut et réconciliation planifiée. Voir `bictorys-integration-notes.md`, section « Confirmation et réconciliation ».
- **Écarts restants** : E5 (corps du refresh côté front, hors périmètre), E12 (format du webhook et remboursement, à valider en sandbox), carte bloquée côté Bictorys.

## 9. Alignement du front (2026-10-27)

- **`GET /users/:username`** renvoie aussi `country`, `stack` et `level` (jamais l'e-mail). `UserProfileDto` (Swagger) et le type `PublicUserProfile` du front suivent.
- **Badge « Développeur vérifié »** : la page « Mon compte » permet de saisir pays, niveau, stack et bio (≥ 50 caractères) et affiche la liste des conditions (`verifiedBadgeCriteria`, miroir de `isVerifiedProfile`). Limites de la stack : 10 éléments, 30 caractères chacun.
- **Réponse ≥ 30 caractères** appliquée des deux côtés (E13). **Accès admin** aligné (E14). **429** : message français `COMMON_TOO_MANY_REQUESTS`.
- **Offres d'emploi (front)** : liste et section d'accueil lues sur `GET /jobs` (filtres pays, mode, devise d'affichage, pagination « Charger plus »), détail `/jobs/:id`, candidature `POST /jobs/:id/apply` (message, sans CV), publication `POST /jobs` avec activation du profil recruteur à la demande. Le niveau d'expérience, les missions, le profil et les avantages des anciennes données de démonstration n'existent pas dans l'API : ils ne sont plus affichés. Non fait : téléversement du CV, tableau de bord recruteur (`/jobs/mine`), quota du plan, alertes emploi, modération des offres.
- **Vote et acceptation (front)** : sur la page d'une question, vote ▲▼ sur la question et sur chaque réponse (`POST /votes/posts/:id`, `/votes/answers/:id`, score mis à jour avec `newScore`), et bouton « Accepter cette réponse » pour l'auteur (`PATCH /forum/answers/:id/accept`). Les erreurs de l'API (réputation < 10, vote sur son propre contenu) s'affichent en toast. Les mêmes actions (vote, acceptation, signalement) sont disponibles dans la fenêtre de discussion ouverte depuis la liste du forum. Non fait : retenir le vote déjà donné par le membre (l'API ne le renvoie pas) et mettre à jour le compteur de la carte de la liste après un vote dans la fenêtre.
- **Notifications** : `Notification.link` (nouvelle colonne facultative, migration `20261027120000_notification_link`) enregistre le chemin web du contenu concerné ; les notifications antérieures restent sans lien et le front retombe sur une page selon le type. Le front liste `GET /notifications` (pagination « Voir plus »), marque une notification lue au clic et tout marquer lu ; le menu du compte affiche le nombre de non lues (`GET /notifications/unread-count`, lu à l'ouverture du menu). Non fait : réception en temps réel par WebSocket et préférences de notification.
- **Signalement** : bouton « Signaler » (motif de la liste `SPAM`, `OFFENSIVE`, `OFF_TOPIC`, `DUPLICATE`, `OTHER` et précisions ≤ 500 caractères) sur les questions, les réponses et les projets, via `POST /moderation/reports`. Masqué aux visiteurs et à l'auteur du contenu ; un 409 (déjà signalé) verrouille le bouton. Les offres d'emploi ne sont pas signalables : `ReportEntityType` ne contient que POST, ANSWER et PROJECT.
- **Administration (front)** : `/admin` regroupe, pour les modérateurs et administrateurs, les **signalements** (`GET /moderation/reports` par statut, décision masquer / avertir / laisser visible via `PATCH …/resolve`, ou ignorer) et les **offres à valider** (`GET /jobs/review`, publier, refuser avec un motif de 5 caractères au moins). Réservés aux ADMIN : les **utilisateurs** (`GET /admin/users`, changement de rôle, bannir et lever le ban via `/moderation/users/*`) et le **journal d'audit**. La page « Projets à approuver » est supprimée : l'API publie les projets d'emblée et les modère par signalement. Limite : `GET /admin/users` ne renvoie pas l'état de bannissement (il vit dans `ModerationAction`), l'écran propose donc « Bannir » et « Lever le ban » sans indiquer l'état courant ; le tableau de bord `GET /admin/stats` n'a pas d'écran.
- **Fonctions Phase 1 sans écran** (à ouvrir en tickets front) : modification d'une réponse, paiements et plan recruteur. Mentorat et communautés sont en phase 2 ; leurs pages restent des vitrines à données statiques.
