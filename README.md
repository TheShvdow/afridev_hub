# AfriDev Hub

Plateforme communautaire pour les développeurs d'Afrique : forum Q&A, vitrine de projets, job board, paiements mobiles.

Monorepo **Nx** composé de :

| Dossier | Rôle |
| --- | --- |
| `apps/api` | API REST + WebSocket — NestJS 10, Prisma 5, PostgreSQL, Redis |
| `apps/web` | Front — Angular 18 |
| `libs/shared-types` | Types partagés API ↔ front (enums miroir du schéma Prisma) |
| `libs/ui` | Composants UI (Storybook) |
| `prisma/` | Schéma Prisma, migrations, seed |
| `apps/api/_bmad-output/` | Documentation de projet (PRD, spine d'architecture, contrat de données, epics) |

## Prérequis

- Node.js et npm (versions à aligner sur le `package.json`)
- Une base PostgreSQL et une instance Redis :
  - en local : `npm run docker:dev` (Postgres 16 + Redis 7, voir `docker-compose.yml`) ;
  - en dev partagé : Neon (Postgres) et Upstash (Redis), voir `.env.example`.

## Installation

```bash
npm install                 # installe les dépendances et génère le client Prisma
cp .env.example .env        # puis remplir les vraies valeurs (ne jamais commiter .env)
```

Variables requises au démarrage de l'API (validées par `apps/api/src/config/config.schema.ts`) : `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (32 caractères minimum chacun), `WEB_URL`. Les variables GitHub OAuth (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`) sont aussi nécessaires, sinon la stratégie GitHub refuse de démarrer.

## Lancer le projet

```bash
npm run start:api           # API sur http://localhost:3000 (nx serve api)
npm run start:web           # front Angular
npm run start:all           # API + front en parallèle
```

Si `nx serve` échoue avec « Failed to process project graph », lancer `npx nx reset` puis relancer.

Vérifications rapides :

- santé : `GET http://localhost:3000/health` ;
- documentation Swagger (hors production) : `http://localhost:3000/api/docs`.

## Base de données (Prisma)

Le schéma est `prisma/schema.prisma`. Les modifications passent par les **migrations** (historique versionné dans `prisma/migrations/`).

```bash
npm run prisma:migrate      # dev : crée une migration à partir du schéma, l'applique
npm run prisma:generate     # régénère le client après un changement de schéma
npm run prisma:migrate:prod # prod : applique les migrations existantes (sans les créer)
npm run prisma:seed         # données de démonstration
npm run prisma:studio       # interface d'exploration de la base
```

Règles :

- ne jamais utiliser `prisma db push` sur une base partagée ;
- commiter le dossier de migration créé avec le changement de schéma ;
- les identifiants sont des UUID v4 (`@default(uuid())`).

## Conventions d'API

- Toutes les routes sont préfixées par `/api` (exception : `/health`). Exemple : `POST /api/auth/login`.
- **Succès** : la réponse est enveloppée `{ "data": … }`. Les listes ajoutent `meta` : `{ "data": […], "meta": { total, page, limit, totalPages } }`.
- **Erreur** : `{ "error": { "code": "DOMAINE_ENTITE_RAISON", "message": "…", "details": […] } }`. `details` n'apparaît que pour les erreurs de validation. Les codes sont listés dans `libs/shared-types/src/index.ts` (type `ErrorCode`).
- **Contrat de données** (champs, enums, règles métier, écarts connus) : `apps/api/_bmad-output/architecture-afridev-hub-phase1/data-contract-afridev-hub-phase1.md`.

### Tester les endpoints

Le fichier `request.http` à la racine contient les requêtes de chaque module. Il faut l'extension **REST Client** (VS Code). Ordre conseillé : *Register* → *Login* → le reste. Les tokens sont chaînés depuis la requête nommée `login` ; les identifiants (`@postId`, `@projectId`, `@jobId`…) se copient depuis les réponses.

## Événements et réputation

Les modules métier ne s'importent pas entre eux (règle AD-10). Ils émettent des événements (`EventEmitter2`) ; `GamificationModule` est le seul à écrire `User.reputation` :

| Événement | Émis par | Effet |
| --- | --- | --- |
| `forum.question.created` | forum | +5 à l'auteur de la question |
| `forum.answer.created` | forum | +10 à l'auteur de la réponse |
| `forum.answer.accepted` | forum | +15 à l'auteur de la réponse acceptée |
| `votes.vote.changed` | votes | +10 pour un vote positif reçu, −2 pour un vote négatif, delta calculé avant/après |

Voter exige une réputation d'au moins 10 points.

## Scripts utiles

```bash
npm run build:api           # build de production de l'API
npm run lint                # lint de tout le monorepo
npm run test                # tests unitaires (nx run-many --target=test)
npm run docker:logs         # logs des services Docker locaux
npm run docker:reset        # repart de zéro (supprime les volumes)
```

## Problèmes connus

- Front : des erreurs de compilation sans rapport avec l'API subsistent (composants non générés, `@angular/platform-server`).
- Front : `AuthService.refreshToken()` envoie un corps vide, alors que l'API exige `refreshToken` (voir l'écart E5 du contrat de données).

## Paiements (Bictorys)

Le plan recruteur premium se paie par le checkout hébergé de Bictorys : l'API crée la charge sans moyen de paiement, le front redirige vers la page de Bictorys, puis un webhook (`POST /api/payments/webhooks/bictorys`) et une réconciliation toutes les 10 minutes règlent le paiement. Variables : `BICTORYS_API_URL`, `BICTORYS_API_KEY` (clé publique), `BICTORYS_WEBHOOK_SECRET`, `BICTORYS_COUNTRY` (SN par défaut).

- `WEB_URL` doit être une adresse publique, même en local : Bictorys refuse (403) les URLs de retour qui contiennent `localhost`.
- Les frais payés par le client s'ajoutent au prix (25 000 devient 25 507,53 en sandbox) ; le prix reste fixé par le serveur.
- Détails vérifiés en sandbox : `apps/api/_bmad-output/architecture-afridev-hub-phase1/bictorys-integration-notes.md`.

## Parcours utilisateurs

Les 14 parcours de l'application sont décrits en diagrammes de séquence PlantUML dans [docs/parcours-utilisateurs](docs/parcours-utilisateurs/README.md), avec les images JPEG rendues.

## Documentation de projet

Le dossier `apps/api/_bmad-output/` contient le PRD, le glossaire, la spine d'architecture (AD-1 à AD-12), le contrat de données et les epics. Les règles métier de référence sont dans `spec-afridev-hub-phase1/glossary.md`.
