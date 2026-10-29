# Suite de bout en bout du front

Parcours utilisateurs rejoués dans un vrai navigateur (Chromium, via Playwright) contre le front Angular et l'API réelle.

| Fichier | Parcours |
|---|---|
| `00-demarrage` | l'API répond, le front s'affiche |
| `01-visiteur` | pages publiques, pages réservées renvoyées vers la connexion |
| `02-authentification` | connexion, mot de passe erroné, inscription et vérification d'e-mail |
| `03-forum` | question, réponse, vote immédiat, vote conservé, acceptation, signalement |
| `04-offres` | publication, validation, candidature enrichie, lecture par le recruteur, modification, clôture, alertes |
| `05-moderation` | signalement, traitement par la modération, contenu masqué, droits d'accès |
| `06-notifications` | notification en temps réel, ouverture, « tout marquer comme lu » |
| `07-administration` | tableau de bord, bannissement, journal d'audit |

## Dans la CI

Le workflow `.github/workflows/e2e.yml` rejoue toute la suite sur chaque pull request (PostgreSQL et Redis en services, base migrée et peuplée, API et front lancés, Chromium installé). Le rapport et les journaux sont joints à l'exécution en cas d'échec.

## Prérequis

1. **Une base peuplée** : `npm run prisma:migrate:prod` puis `npm run prisma:seed` (pays, tags, catégories, badges). Jamais la base de production : la suite écrit en base.
2. **L'API lancée** sur `http://localhost:3000` avec cette base, avec :
   - `JWT_ACCESS_EXPIRES=2h` : les jetons de test doivent durer toute la série ;
   - `THROTTLE_LIMIT=2000` : la limite globale de 60 requêtes par minute et par adresse serait vite atteinte ;
   - `NODE_ENV=development` : l'envoi d'e-mails est alors simulé (aucun mail réel ne part).
3. **Le front lancé** sur `http://localhost:4200` (`npm run start:web`).
4. **Le navigateur de test** : `npx playwright install chromium` (une fois, environ 165 Mo).

## Lancement

```bash
export DATABASE_URL='postgresql://…'   # la même base que l'API
npm run e2e                            # toute la suite
npm run e2e -- tests/04-offres.spec.ts # un fichier
npm run e2e:report                     # rapport HTML après un échec (captures, traces)
```

`DATABASE_URL` sert à créer et supprimer les comptes de test directement en base ; elle n'est jamais écrite dans un fichier.

Autres variables : `E2E_WEB_URL`, `E2E_API_URL`, `E2E_PASSWORD`.

Les jetons et le mot de passe de l'exécution sont gardés dans `apps/web-e2e/.auth/` (ignoré par git) pour le mode `E2E_REUSE=1`.

## Ce que la suite crée, et comment elle nettoie

- Six comptes `e2e_*` (`author`, `helper`, `candidate`, `recruiter`, `mod`, `admin`), au mot de passe tiré au hasard à chaque exécution (`E2E_PASSWORD` pour le fixer), vérifiés et avec assez de réputation pour voter. Les comptes de démonstration ne sont jamais utilisés ni modifiés.
- Des questions, réponses, offres, candidatures, alertes… dont les titres commencent par `[E2E]`.
- **À la fin, tout est supprimé** (comptes et contenus, par suppression en cascade). `E2E_KEEP=1` conserve l'état pour inspecter après un échec ; le lancement suivant repart d'un état propre.

## Itérer vite

`E2E_REUSE=1 npm run e2e -- tests/04-offres.spec.ts` réutilise les comptes existants, remet leur contenu à zéro (le plan gratuit limite à 3 offres par mois et par recruteur) et ne se reconnecte que si les jetons ont expiré. La route de connexion est limitée à 10 appels par minute : la suite attend la fenêtre suivante en cas de 429.

## Limites connues

- L'**inscription** n'est testée que jusqu'à l'écran de vérification : le code arrive par e-mail, que la suite ne lit pas. Le test vérifie que l'adresse est conservée et qu'un faux code est refusé.
- L'**envoi d'un CV** vers R2 n'est pas couvert (stockage externe, règle CORS à configurer) ; la candidature est testée sans CV.
- Les **e-mails** (accusé de réception, code) sont simulés en développement : rien n'est vérifié dans une boîte de réception.
- Les scénarios sont **séquentiels** et partagent la base (un seul worker) ; l'ordre des fichiers compte.
- Sur le serveur de développement, la page arrive déjà rendue avant d'être « branchée » : un clic immédiat est perdu. `openThread` (dans `support/fixtures.ts`) recommence le clic jusqu'à ouverture. Sur l'application déployée (rendu côté client), ce problème n'existe pas.
