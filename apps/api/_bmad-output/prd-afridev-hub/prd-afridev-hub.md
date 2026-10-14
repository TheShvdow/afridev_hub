---
title: AfriDev Hub — Product Requirements Document
status: final
created: 2026-10-13
updated: 2026-10-13
slug: afridev-hub
source: AfriDev Hub — BMAD Structure (Claude Doc, 2026-10-06)
---

# PRD : AfriDev Hub

## 0. Objet du document

Ce PRD est destiné au PM (Idrissa), aux contributeurs techniques (dev senior, dev junior), et aux agents IA qui aval (architecture, epics, stories). Il documente les exigences produit d'**AfriDev Hub** — une plateforme communautaire pour développeurs africains — et sert de référence amont pour l'architecture technique et le découpage en stories BMAD.

Le vocabulaire est ancré dans le **Glossaire (§3)**. Les features sont regroupées par domaine avec des exigences fonctionnelles (FR) numérotées globalement. Les hypothèses sont balisées `[ASSUMPTION]`. Les éléments hors scope MVP sont balisés `[NON-GOAL MVP]`.

**Documents connexes :**
- BMAD Structure (Epic Map + Sprint Plan + ADRs) — Claude Doc AfriDev Hub — BMAD Structure
- AGENTS.md / CLAUDE.md — contexte technique du repo `apps/api/`
- Prisma schema — `prisma/schema.prisma` (monorepo root)

---

## 1. Vision

AfriDev Hub est la première plateforme communautaire pensée spécifiquement pour les développeurs d'Afrique sub-saharienne : un espace unique pour poser et répondre à des questions techniques, présenter ses projets open-source, trouver (ou publier) des offres d'emploi tech avec salaire transparent, et se faire accompagner par un mentor en payant via Wave, Orange Money ou MTN MoMo.

La plateforme s'adresse aux développeurs qui vivent une réalité radicalement différente de celle de Stack Overflow ou LinkedIn : connexions 3G intermittentes, paiement mobile omniprésent, marché de l'emploi régional, et besoin d'une communauté qui parle leur langue — française d'abord, anglophone aussi. Elle n'est pas un clone de produits occidentaux adapté à la hâte ; elle part des contraintes africaines pour construire une expérience d'abord mobile, d'abord offline-capable, d'abord local-payment-first.

À terme, AfriDev Hub deviendra le point de référence pour la réputation technique des développeurs africains : un score de réputation construit à travers les questions répondues, les projets publiés et les sessions de mentorat animées — un signal lisible par les recruteurs et les startups locales.

---

## 2. Utilisateurs cibles

### 2.1 Jobs To Be Done

**Développeur junior (Mamadou)**
- Trouver rapidement une réponse à un problème de code sans avoir à reformuler sa question en anglais.
- Construire une réputation visible sur le marché africain grâce aux contributions.
- Trouver une première opportunité professionnelle avec un salaire affiché en FCFA ou en devise locale.
- Progresser techniquement grâce à l'accès à des mentors seniors accessibles financièrement.

**Développeur senior / mentor (Fatou)**
- Partager son expertise et gagner en visibilité dans la communauté tech africaine.
- Générer des revenus complémentaires via le mentorat payant, sans friction de paiement international.
- Recruter des juniors motivés pour ses propres projets ou sa startup.

**Recruteur / startup (Kofi)**
- Publier des offres ciblant le marché africain avec un salaire transparent en devise locale.
- Accéder à des profils de développeurs vérifiés (email + stack + projets GitHub liés).
- Réduire le coût et le délai de recrutement par rapport aux job boards génériques.

**Utilisatrice mobile / zone peu connectée (Aissatou)**
- Lire les dernières discussions techniques et répondre à des questions même en zone 3G ou hors connexion.
- Utiliser la plateforme comme une app depuis l'écran d'accueil Android sans passer par un app store.
- Ne pas être pénalisée par une connexion intermittente : ses contributions sont sauvegardées et synchronisées à la reconnexion.

### 2.2 Non-utilisateurs (v1)

- Développeurs hors Afrique sub-saharienne : la plateforme n'est pas internationale v1 ; l'interface est en français, les devises sont locales.
- Formations en ligne (formateurs, apprenants, certifications) : `[NON-GOAL MVP]`
- Entreprises > 50 salariés cherchant un ATS complet : hors scope.

### 2.3 Parcours utilisateurs clés

**UJ-1. Mamadou débogue son premier projet NestJS.**
- **Persona + contexte :** Mamadou, dev junior Dakar, 6 mois d'expérience, connexion mobile 3G.
- **État d'entrée :** connecté, vient de lire 3 questions similaires sans trouver sa réponse.
- **Parcours :** Clique « Nouvelle question » → rédige avec prévisualisation Markdown → voit 3 questions similaires suggérées → aucune ne correspond → soumet → reçoit une réponse 2 h plus tard (notification email).
- **Climax :** Mamadou accepte la réponse, son problème est résolu. Le répondeur gagne +15 pts de réputation.
- **Résolution :** La question est marquée « résolue » et remonte dans la recherche full-text pour les prochains.
- **Cas limite :** Si Mamadou perd sa connexion pendant la rédaction, le brouillon est sauvegardé localement (IndexedDB) et soumis à la reconnexion.

**UJ-2. Fatou publie son projet open-source et recrute un junior.**
- **Persona + contexte :** Fatou, dev senior Abidjan, lead d'une startup fintech, compte GitHub actif.
- **État d'entrée :** connectée, profil vérifié (badge), réputation > 500.
- **Parcours :** Ouvre « Soumettre un projet » → colle le lien GitHub → AfriDev Hub importe automatiquement stars, langage, date → Fatou complète la description et la stack → publie. Le projet apparaît dans la vitrine filtrée par « Côte d'Ivoire / React ». Trois semaines plus tard, elle publie une offre d'emploi junior sur le même stack.
- **Climax :** Fatou reçoit 5 candidatures dont 2 avec un score de réputation > 100 sur la plateforme.
- **Résolution :** Elle contacte les candidats via le formulaire et clôt l'offre.

**UJ-3. Kofi recrute un dev Angular depuis Lagos.**
- **Persona + contexte :** Kofi, RH startup Nigeria, budget recrutement < 200 $/mois.
- **État d'entrée :** compte recruteur créé, plan freemium (3 offres/mois).
- **Parcours :** Clique « Publier une offre » → remplit titre, description, stack Angular, pays Nigeria, mode remote, salaire 400 000 NGN/mois → soumet → l'offre est visible avec salaire affiché en NGN pour les devs nigérians, en FCFA pour les devs sénégalais (conversion automatique).
- **Climax :** Kofi reçoit 8 candidatures en 7 jours. Il visualise les profils des candidats (lien AfriDev Hub + CV optionnel).
- **Résolution :** L'offre expire automatiquement après 60 jours avec rappel à J50.

**UJ-4. Mamadou réserve une session de mentorat avec Fatou.**
- **Persona + contexte :** Mamadou vient d'accepter un poste mais a besoin d'aide sur l'architecture microservices.
- **État d'entrée :** connecté, réputation 45 pts, 0 session de mentorat précédente.
- **Parcours :** Recherche « mentor React / Abidjan » → trouve le profil de Fatou (note 4,8/5, tarif 5 000 FCFA/30 min) → sélectionne un créneau disponible → confirme et pré-autorise le paiement Wave (numéro de téléphone → lien Wave → confirmation webhook) → reçoit un rappel 1 h avant avec le lien de visioconférence.
- **Climax :** La session a lieu. Le paiement est capturé automatiquement 1 h après le début. Fatou reçoit un reçu par email.
- **Résolution :** Mamadou évalue la session (4 étoiles + commentaire). Fatou voit la note sur son dashboard mentor.

**UJ-5. Aissatou lit le forum hors connexion.**
- **Persona + contexte :** Aissatou, dev junior Bamako, réseau 3G coupant, utilise Chrome Android.
- **État d'entrée :** a ouvert AfriDev Hub une fois en WiFi, l'a ajouté à l'écran d'accueil.
- **Parcours :** Lance l'app depuis l'écran d'accueil hors connexion → voit les 20 dernières questions du forum (cache Service Worker) → lit les réponses → tente de voter → voit « Action synchronisée à la reconnexion » → reprend la connexion → le vote est envoyé automatiquement.
- **Climax :** Aissatou contribue à la communauté sans être bloquée par la connectivité.

---

## 3. Glossaire

- **AfriDev Hub** — La plateforme communautaire objet de ce PRD.
- **Question** — Publication dans le Forum Q&A avec titre, corps Markdown et tags. Unité de base de la connaissance partagée.
- **Réponse** — Contribution textuelle (Markdown, ≥ 30 caractères) en réponse à une Question.
- **Vote** — Action up/down sur une Question ou Réponse par un Membre dont la Réputation est ≥ 10.
- **Réponse acceptée** — Réponse marquée par l'auteur de la Question comme résolvant son problème.
- **Réputation** — Score numérique calculé à partir des votes reçus, des réponses acceptées, et des contributions. Gouverne les privilèges sur la plateforme.
- **Membre** — Utilisateur avec compte confirmé (email ou OAuth).
- **Modérateur** — Membre ayant des droits de modération sur le contenu (signalements, masquage).
- **Mentor** — Membre senior (profil vérifié, ≥ 3 ans déclarés) validé manuellement par un admin pour offrir des Sessions de mentorat payantes.
- **Session de mentorat** — Rencontre en visioconférence de 30, 60 ou 90 min entre un Mentor et un Mentoré, avec pré-autorisation et capture automatique du paiement.
- **Projet** — Réalisation logicielle soumise par un Membre dans la Vitrine Projets (lien GitHub, stack, catégorie, pays).
- **Offre** — Publication dans le Job Board par un Recruteur (titre, stack, pays, mode, salaire obligatoire).
- **Recruteur** — Membre avec profil entreprise pouvant publier des Offres.
- **Groupe** — Sous-communauté publique ou privée avec admin, modérateurs et membres.
- **PaymentProvider** — Interface abstraite implémentée par chaque opérateur de paiement (Wave, Orange Money, MTN MoMo, Stripe).
- **Wave / Orange Money / MTN MoMo** — Opérateurs de paiement mobile africains intégrés comme implémentations de PaymentProvider.
- **Stripe** — Opérateur international (carte Visa/Mastercard), fallback quand l'opérateur mobile est indisponible.
- **Webhook de paiement** — Notification HTTP envoyée par l'opérateur à AfriDev Hub pour confirmer (ou rejeter) une transaction. Traitement idempotent obligatoire.
- **Service Worker** — Script navigateur qui gère le cache hors connexion (stratégie Workbox CacheFirst pour les assets statiques).
- **Story Point** — Unité d'estimation de complexité (suite Fibonacci : 1, 2, 3, 5, 8, 13). Vélocité initiale : 20 pts/sprint.
- **Phase 1** — Premières 16 semaines : Infra + Auth + Forum + Vitrine + Job Board + Paiements (Wave + Stripe). Cible : bêta fermée à S17.
- **Phase 2** — Après S17 : Mentorat 1-to-1, PWA & Offline-First, Groupes & Communautés.

---

## 4. Features

### 4.1 Infrastructure & Fondation

**Description :** Socle technique opérationnel avant toute feature utilisateur. Monorepo Nx (Angular 18 + NestJS 10), Docker Compose, pipeline CI GitHub Actions, design system Tailwind + shadcn/ui, base de données PostgreSQL avec Prisma, Redis, domaine + SSL, déploiement automatique sur Systalink.

**Exigences fonctionnelles :**

#### FR-1 : Monorepo Nx opérationnel
Le dev peut démarrer l'ensemble du stack local (API + web + PostgreSQL + Redis) avec `docker compose up` depuis la racine du monorepo. La commande se termine sans erreur en < 3 min sur un poste standard. Réalise UJ-1.

**Conséquences testables :**
- `docker compose up` démarre les 4 services (api, web, postgres, redis) sans erreur.
- `npm run lint` et `npm run test` passent en CI sur chaque PR.
- TypeScript strict activé ; aucun `any` implicite.

#### FR-2 : Pipeline CI/CD GitHub Actions
Chaque PR déclenche un pipeline (lint + tests + build). Chaque merge sur `main` déclenche un déploiement automatique sur Systalink.

**Conséquences testables :**
- Pipeline CI échoue si lint ou test échoue.
- Déploiement prod accessible sur `https://afridevhub.com` < 5 min après merge.
- Variables d'environnement sensibles présentes dans `.env.example`, jamais commitées.

#### FR-3 : Design system
Les tokens couleur, typographie et composants shadcn/ui sont configurés et partagés entre `apps/web` et `libs/shared-types`. Réalise UJ-1, UJ-2, UJ-4.

**Conséquences testables :**
- Les composants `Button`, `Input`, `Card` respectent les tokens définis dans le design system.
- Storybook (ou équivalent) liste les composants partagés.

---

### 4.2 Authentification & Profils

**Description :** Inscription et connexion via email/mot de passe, OAuth GitHub, OAuth Google. Onboarding guidé 3 étapes. Profil public accessible sans connexion à `/@username`. Badge vérifié automatique. Score de réputation temps réel. Réalise UJ-1, UJ-2, UJ-3, UJ-4.

**Exigences fonctionnelles :**

#### FR-4 : Inscription email
Le visiteur peut créer un compte avec email + mot de passe (min 8 chars, 1 majuscule, 1 chiffre). Un email de confirmation est envoyé dans les 60 secondes.

**Conséquences testables :**
- Compte inactif jusqu'à confirmation email.
- Email de confirmation reçu en < 60 s.
- Mot de passe haché en base (bcrypt, jamais en clair).

#### FR-5 : OAuth GitHub
Le visiteur peut se connecter via OAuth GitHub en un clic (bouton sur la page login/inscription).

**Conséquences testables :**
- Après autorisation GitHub, le Membre est connecté et son profil est pré-rempli (nom, avatar, lien GitHub).
- Le compte est créé automatiquement à la première connexion OAuth.

#### FR-6 : OAuth Google
Identique à FR-5 pour OAuth Google.

#### FR-7 : Onboarding guidé
Après la première connexion, le Membre est redirigé vers un onboarding 3 étapes (pays, stack principale, niveau) avant d'accéder au feed personnalisé.

**Conséquences testables :**
- L'onboarding est sauté si le Membre a déjà complété ces 3 champs.
- Le feed personnalisé charge les questions tagguées avec la stack du Membre.

#### FR-8 : Profil public
N'importe qui (connecté ou non) peut consulter le profil public d'un développeur à `/@username` : bio, stack, pays, réputation, questions posées, réponses données, projets publiés.

**Conséquences testables :**
- Accessible sans authentification (HTTP 200).
- Meta-tags Open Graph générés pour le partage (SSR Angular 18).
- Liens GitHub/LinkedIn/site affichés si renseignés.

#### FR-9 : Modification de profil
Le Membre peut mettre à jour ses informations (bio, stack, pays, photo, liens) depuis les paramètres de compte.

#### FR-10 : Badge « vérifié » automatique
Le système attribue automatiquement le badge « vérifié » quand les 5 conditions sont remplies : email confirmé + pays renseigné + stack renseignée + bio ≥ 50 caractères + au moins 1 lien externe.

**Conséquences testables :**
- Le badge apparaît sur le profil et dans toutes les contributions du Membre.
- Retrait automatique si une condition est invalidée (ex. lien supprimé).

#### FR-11 : Score de réputation
Le score de réputation est mis à jour en temps réel (WebSocket) à chaque événement : question posée (+5), réponse donnée (+10), vote upvote reçu (+10), vote downvote reçu (−2), réponse acceptée (+15).

**Conséquences testables :**
- Le score s'actualise sur le profil public sans rechargement de page.
- Les règles de réputation sont documentées dans l'UI (tooltip ou page dédiée).

---

### 4.3 Forum Q&A

**Description :** Cœur de la plateforme. Création et découverte de questions techniques en Markdown. Système de votes, réponse acceptée, détection de doublons, recherche full-text, notifications, modération. Réalise UJ-1, UJ-5.

**Exigences fonctionnelles :**

#### FR-12 : Création de question
Le Membre peut créer une question avec titre (≥ 15 chars), corps Markdown (≥ 50 chars), et tags (1 à 5 tags existants ou créés à la volée).

**Conséquences testables :**
- Formulaire bloqué si titre < 15 chars ou corps < 50 chars (validation front + back).
- Maximum 5 tags ; tags créés automatiquement en minuscules.

#### FR-13 : Prévisualisation Markdown
Pendant la rédaction, le Membre voit une prévisualisation Markdown en temps réel côte à côte avec l'éditeur.

**Conséquences testables :**
- La prévisualisation se met à jour < 300 ms après chaque frappe (debounce).
- Support des blocs de code, listes, titres, liens, images.

#### FR-14 : Détection de doublons
Avant soumission, le système affiche les 3 questions les plus similaires au titre (recherche approximative, min-similarité : 0.6).

**Conséquences testables :**
- Les suggestions apparaissent < 1 s après saisie du titre (debounce 500 ms).
- Le Membre peut ignorer les suggestions et soumettre quand même.

#### FR-15 : Réponses
Le Membre peut répondre à une question avec un corps Markdown ≥ 30 caractères. Il ne peut pas répondre à sa propre question.

**Conséquences testables :**
- Formulaire de réponse bloqué si corps < 30 chars.
- L'auteur de la question voit toujours son propre formulaire pour ajouter des précisions (via « modifier la question »), pas via « répondre ».

#### FR-16 : Votes
Tout Membre avec Réputation ≥ 10 peut voter positivement (+1) ou négativement (−1) sur une Question ou Réponse, sauf sur son propre contenu.

**Conséquences testables :**
- Bouton de vote désactivé si Réputation < 10 (avec tooltip explicatif).
- Vote stocké ; second clic sur le même bouton annule le vote (toggle).
- Score de réputation de l'auteur mis à jour immédiatement.

#### FR-17 : Réponse acceptée
L'auteur d'une Question peut marquer une Réponse comme acceptée. Une seule Réponse acceptée par Question.

**Conséquences testables :**
- Indicateur visuel clair (coche verte) sur la Réponse acceptée.
- La Réponse acceptée remonte automatiquement en premier dans le tri.
- L'auteur de la Réponse gagne +15 pts de Réputation.

#### FR-18 : Notifications
Le Membre est notifié (in-app via WebSocket + email) quand : quelqu'un répond à sa Question, son contenu reçoit un vote, sa Réponse est acceptée.

**Conséquences testables :**
- Notification in-app apparaît < 3 s via WebSocket.
- Email envoyé < 5 min après l'événement.
- Le Membre peut désactiver les notifications email dans ses préférences.

#### FR-19 : Recherche full-text
Le Membre (connecté ou non) peut rechercher par mots-clés ou tags. Résultats triés par pertinence.

**Conséquences testables :**
- Recherche < 300 ms pour un corpus de 10 000 questions.
- Filtrage par tag possible depuis la barre de recherche ou les chips de tags.
- Support caractères accentués (français).

#### FR-20 : Signalement
Tout Membre peut signaler un contenu (Question ou Réponse) comme inapproprié, avec une raison sélectionnée dans une liste prédéfinie.

**Conséquences testables :**
- Un même Membre ne peut signaler un contenu qu'une fois.
- Signalement crée un ticket dans la queue de modération.

#### FR-21 : Queue de modération
Un Modérateur accède à la liste des contenus signalés et peut : masquer le contenu, le restaurer, ou ignorer le signalement.

**Conséquences testables :**
- La queue est accessible depuis un menu dédié (rôle Modérateur requis).
- Action de masquage immédiatement reflétée côté utilisateur (contenu remplacé par « [Contenu masqué] »).
- Journal d'audit conservé pour chaque action de modération.

---

### 4.4 Vitrine Projets

**Description :** Les Membres soumettent leurs projets open-source. Import automatique des stats GitHub. Filtres par catégorie, stack et pays. Étoiles. Anti-spam automatique. Réalise UJ-2.

**Exigences fonctionnelles :**

#### FR-22 : Soumission de projet
Le Membre soumet un projet avec : nom, description (≥ 50 chars), lien GitHub valide, catégorie (liste prédéfinie), stack (1-5 tags), pays.

**Conséquences testables :**
- Lien GitHub validé (URL github.com/*/repo existant via GitHub API).
- Description < 50 chars bloquée côté back.

#### FR-23 : Import GitHub automatique
À la soumission, le système appelle l'API GitHub pour importer stars, langage principal, et date de dernière mise à jour.

**Conséquences testables :**
- Import asynchrone ; l'utilisateur voit un indicateur de chargement.
- En cas d'échec API GitHub (rate limit, repo privé), le projet est soumis sans ces métadonnées ; message d'info affiché.

#### FR-24 : Page projet
La page d'un projet affiche description, stack, stats GitHub importées, nom et avatar de l'auteur, nombre d'étoiles AfriDev Hub.

**Conséquences testables :**
- Accessible sans authentification.
- Meta-tags Open Graph pour le partage.

#### FR-25 : Étoiles
Un Membre connecté peut étoiler un projet (toggle). Une étoile par projet par Membre.

#### FR-26 : Filtres vitrine
Le visiteur peut filtrer la vitrine par catégorie, stack et pays de l'auteur.

**Conséquences testables :**
- URL partageable reflétant les filtres actifs (query params).
- Filtres combinables (catégorie + stack + pays en même temps).

#### FR-27 : Anti-spam automatique
Le système rejette automatiquement les soumissions avec lien GitHub invalide ou description < 50 chars. `[ASSUMPTION: un seuil de score de spam (critères à définir) sera ajouté plus tard pour détecter les soumissions manifestement frauduleuses.]`

---

### 4.5 Job Board

**Description :** Publication d'offres avec salaire obligatoire en devise locale. Filtres candidat avancés. Candidature directe. Alertes email. Expiration automatique. Plan recruteur premium. Réalise UJ-2, UJ-3.

**Exigences fonctionnelles :**

#### FR-28 : Publication d'offre
Le Recruteur publie une offre : titre, description (Markdown), stack (1-5 tags), pays, mode (remote / onsite / hybride), salaire obligatoire (montant + devise locale, ex. 400 000 NGN, 300 000 FCFA).

**Conséquences testables :**
- Le champ salaire est obligatoire ; offre bloquée si absent.
- Offre soumise à validation manuelle légère (anti-spam) avant publication.

#### FR-29 : Filtres candidat
Le Membre peut filtrer les offres par pays, mode (remote/onsite/hybride), stack et fourchette salariale.

**Conséquences testables :**
- Filtres combinables ; URL partageable.
- Les salaires sont affichés dans la devise préférée du Membre (conversion au taux du jour). `[ASSUMPTION: taux de change récupéré quotidiennement depuis une API publique (ex. ExchangeRate-API).]`

#### FR-30 : Affichage multi-devises
Les salaires sont affichés convertis dans la devise préférée du Membre (choisie à l'onboarding ou dans les paramètres).

#### FR-31 : Candidature directe
Le Membre candidature directement via un formulaire (message de motivation, lien profil AfriDev Hub, CV optionnel PDF ≤ 5 MB).

**Conséquences testables :**
- PDF stocké dans Cloudflare R2.
- Le Recruteur reçoit un email de notification pour chaque candidature.
- Le Membre ne peut pas candidater deux fois à la même offre.

#### FR-32 : Alertes email
Le Membre active une alerte email pour un ensemble de critères (stack + pays + salaire minimum). Il reçoit un email récapitulatif hebdomadaire si de nouvelles offres correspondantes ont été publiées.

#### FR-33 : Expiration automatique
Les offres expirent automatiquement 60 jours après leur publication. Un rappel email est envoyé au Recruteur à J50.

**Conséquences testables :**
- L'offre passe en statut « expirée » et n'apparaît plus dans les résultats de recherche.
- Le Recruteur peut renouveler l'offre depuis son dashboard.

#### FR-34 : Plan recruteur premium
Le Recruteur peut souscrire à un plan premium (25 000 FCFA/mois) pour : offres illimitées (gratuit : 3/mois), accès aux profils complets des candidats (gratuit : profil tronqué). `[ASSUMPTION: paiement du plan via PaymentProvider (Wave / Stripe) avec abonnement mensuel.]`

---

### 4.6 Paiements Africains

**Description :** Couche d'abstraction `PaymentProvider` couvrant Wave, Orange Money, Stripe (fallback). Webhooks idempotents. Reçus email. Réalise UJ-4.

**Exigences fonctionnelles :**

#### FR-35 : Interface PaymentProvider
Le code métier (Mentorat, Job Board premium) interagit uniquement via l'interface `PaymentProvider` : `initiate()`, `capture()`, `refund()`, `getStatus()`. Réalise l'ADR-03.

**Conséquences testables :**
- Ajout d'un nouvel opérateur = nouvelle classe sans modifier les modules métier.
- Tests unitaires de l'interface couvrent les 4 méthodes, mocks par opérateur.

#### FR-36 : Intégration Wave
L'utilisateur paie via Wave (Sénégal / Côte d'Ivoire) : saisit son numéro de téléphone, reçoit un lien de paiement Wave, confirme sur l'app Wave, AfriDev Hub reçoit la confirmation via webhook.

**Conséquences testables :**
- Flux de bout en bout documenté (séquence : `initiate` → lien Wave → paiement utilisateur → webhook → `capture`).
- En cas de timeout (pas de webhook en 15 min), statut passe en « expiré » et l'utilisateur est informé.

#### FR-37 : Intégration Orange Money
Identique à FR-36 pour Orange Money (Sénégal / Côte d'Ivoire / Mali).

#### FR-38 : Stripe (fallback)
L'utilisateur peut payer par carte Visa/Mastercard via Stripe si son opérateur mobile est indisponible.

#### FR-39 : Webhooks idempotents
Le système vérifie la référence unique de chaque notification webhook avant traitement pour éviter les doubles traitements.

**Conséquences testables :**
- Appel webhook en double sur la même référence → traitement unique, deuxième appel retourne HTTP 200 sans retraitement.
- Couverture test : 100 % des flux de paiement (cf. DoD BMAD).

#### FR-40 : Reçu email
Après chaque paiement confirmé, le payeur reçoit un email de reçu (montant, devise, date, référence unique, nom du produit).

---

### 4.7 Mentorat 1-to-1 *(Phase 2)*

**Description :** Profil mentor, calendrier de disponibilités, réservation + pré-autorisation paiement, rappels, capture automatique, évaluation post-session, dashboard mentor, règles de suspension. Réalise UJ-4.

`[NON-GOAL MVP Phase 1 — planifié Phase 2]`

**Exigences fonctionnelles (Phase 2) :**

#### FR-41 : Profil mentor
Un Membre senior (profil vérifié, ≥ 3 ans déclarés) peut créer un profil mentor : bio, tarif en devise libre, spécialités, disponibilités hebdomadaires.

#### FR-42 : Validation admin
Chaque demande de profil mentor est validée manuellement par un admin en ≤ 48 h.

#### FR-43 : Réservation + pré-autorisation
Un junior recherche un mentor par compétence et pays, réserve un créneau (30/60/90 min), et pré-autorise le paiement en une seule action.

#### FR-44 : Rappel automatique
Le mentor et le mentoré reçoivent un email de rappel 1 h avant avec le lien de session.

#### FR-45 : Capture automatique
Le paiement est capturé automatiquement 1 h après l'heure de début (sauf litige ouvert).

#### FR-46 : Évaluation post-session
Le mentoré peut évaluer la session (1-5 étoiles + commentaire optionnel) dans les 48 h.

#### FR-47 : Dashboard mentor
Le mentor accède à un dashboard : revenus cumulés, nombre de sessions, note moyenne.

#### FR-48 : Règles d'annulation
Annulation gratuite jusqu'à 24 h avant ; au-delà : 50 % du tarif facturé au mentoré.

#### FR-49 : Suspension automatique
Un mentor dont la note moyenne descend < 2/5 sur les 3 dernières évaluations est suspendu automatiquement et un ticket admin est créé.

---

### 4.8 PWA & Offline-First *(Phase 2)*

**Description :** Manifest web, Service Worker Workbox, cache forum offline, sync différée IndexedDB, images WebP + lazy loading, Lighthouse > 85 en 3G, bundle JS < 150 KB. Réalise UJ-5.

`[NON-GOAL MVP Phase 1 — planifié Phase 2]`

**Exigences fonctionnelles (Phase 2) :**

#### FR-50 : PWA installable
AfriDev Hub est installable depuis Chrome Android (manifest + icône + splash screen).

#### FR-51 : Cache statique (CacheFirst)
Service Worker Workbox met en cache tous les assets statiques avec la stratégie CacheFirst. Les ressources se chargent < 1 s à la deuxième visite (réseau disponible).

#### FR-52 : Forum offline
Les 20 dernières Questions du forum sont accessibles hors connexion depuis le cache.

#### FR-53 : Sync différée
Les votes et réponses rédigés hors connexion sont stockés en IndexedDB et synchronisés automatiquement à la reconnexion.

#### FR-54 : Bannière offline
Une bannière non intrusive informe l'utilisateur quand il est hors connexion (avec liste des actions bloquées).

#### FR-55 : Images WebP + lazy loading
Toutes les images uploadées sont converties automatiquement en WebP et servies avec `loading=lazy` et un placeholder blur.

#### FR-56 : Lighthouse > 85 (3G)
Score Lighthouse Performance > 85 en conditions 3G simulées, mesuré par Lighthouse CI dans GitHub Actions.

#### FR-57 : Bundle JS < 150 KB
Bundle JS initial < 150 KB gzip (code splitting par route, tree shaking).

---

### 4.9 Groupes & Communautés *(Phase 2)*

**Description :** Création de groupes publics/privés, rôles (admin/modérateur/membre), posts dans le groupe, événements, modération par l'admin du groupe.

`[NON-GOAL MVP Phase 1 — planifié Phase 2]`

**Exigences fonctionnelles (Phase 2) :**

#### FR-58 : Création de groupe
Le Membre peut créer un groupe public ou privé avec nom, description et pays/techno associée.

#### FR-59 : Adhésion
Rejoindre un groupe public : en un clic. Groupe privé : demande d'adhésion à approuver par l'admin.

#### FR-60 : Posts de groupe
Les membres d'un groupe peuvent publier des posts (texte + liens, Markdown).

#### FR-61 : Événements
L'admin d'un groupe peut créer des événements (titre, date, description, lien externe).

#### FR-62 : Rôles et modération
L'admin peut promouvoir/rétrograder des modérateurs, bannir des membres, supprimer des posts.

---

## 5. Non-Goals explicites

- **Messagerie directe entre membres** (v1) : l'engagement passe par le contenu public, pas la DM. `[NON-GOAL MVP]`
- **Vidéo/audio intégrés** : les sessions de mentorat utilisent un lien externe (Google Meet, Jitsi). `[NON-GOAL MVP]`
- **Application mobile native** (iOS/Android app store) : la PWA couvre le besoin mobile en Phase 2. `[NON-GOAL MVP]`
- **Formations en ligne / cours / certifications** : hors périmètre v1 et v2.
- **API publique** pour développeurs tiers. `[NON-GOAL MVP]`
- **M-Pesa** (Kenya/Tanzanie) : planifié Phase 2 après Wave + Orange Money.
- **Internationalisation anglophone** : l'interface v1 est en français. Anglais planifié Phase 2.
- **Dashboard analytics pour recruteurs** (au-delà des candidatures reçues). `[NON-GOAL MVP]`
- **Tests de compétences intégrés** (coding challenges, quizz). `[NON-GOAL MVP]`

---

## 6. Périmètre MVP

### 6.1 En scope (Phase 1 — 16 sprints × 2 semaines)

- FR-1 à FR-3 : Infrastructure & Fondation (21 pts)
- FR-4 à FR-11 : Authentification & Profils (28 pts)
- FR-12 à FR-21 : Forum Q&A (38 pts)
- FR-22 à FR-27 : Vitrine Projets (20 pts)
- FR-28 à FR-34 : Job Board (24 pts)
- FR-35 à FR-40 : Paiements (Wave + Stripe uniquement en Phase 1, Orange Money en Phase 1 si budget opérateur disponible) (34 pts)

**Total Phase 1 : 165 pts estimés, 16 semaines, vélocité 20 pts/sprint.**

### 6.2 Hors scope Phase 1 (Phase 2 ou au-delà)

- FR-41 à FR-49 : Mentorat 1-to-1 (42 pts) `[NOTE FOR PM: le mentorat est l'axe monétisation principal — à prioriser dès Phase 2, Sprint S9 au plus tôt.]`
- FR-50 à FR-57 : PWA & Offline-First (26 pts)
- FR-58 à FR-62 : Groupes & Communautés (24 pts)
- Orange Money Phase 1 (dépend de la disponibilité de l'API opérateur) `[ASSUMPTION: Orange Money sera en Phase 1 si l'accès sandbox est obtenu avant S7.]`
- MTN MoMo : Phase 2.

---

## 7. Non-Functional Requirements (Cross-Cutting)

### Performance
- **NFR-1 :** Réponse API (endpoints lecture) < 200 ms au p95 pour un corpus de 10 000 questions (cache Redis).
- **NFR-2 :** Bundle JS initial < 150 KB gzip (FR-57 — Phase 2, mais objectif de design dès Phase 1).
- **NFR-3 :** Score Lighthouse Performance > 85 en 3G simulé (FR-56 — Phase 2, Lighthouse CI obligatoire dès Phase 1).

### Sécurité
- **NFR-4 :** Authentification JWT : access token 15 min, refresh token 7 j stocké en Redis. (ADR-05)
- **NFR-5 :** HTTPS obligatoire (Cloudflare SSL). Aucune donnée sensible en clair en base.
- **NFR-6 :** Rate limiting sur les endpoints publics (login, inscription, recherche) : 100 requêtes/min par IP.
- **NFR-7 :** Mots de passe hachés bcrypt (coût ≥ 12).

### Disponibilité
- **NFR-8 :** Uptime cible 99,5 % (hors maintenance planifiée). Systalink mono-instance Phase 1. `[ASSUMPTION: pas de HA en Phase 1 — tolérable pour une bêta.]`
- **NFR-9 :** Déploiement zéro-downtime (rolling restart via PM2 ou équivalent sur Systalink). `[ASSUMPTION: PM2 utilisé pour le process management côté Systalink.]`

### Observabilité
- **NFR-10 :** Logs applicatifs centralisés (format JSON structuré). Erreurs API (5xx) alertées dans les 5 min. `[ASSUMPTION: outil de monitoring à choisir (Sentry, Logtail, ou équivalent gratuit en Phase 1).]`
- **NFR-11 :** Métriques clés exposées (nombre de questions, inscriptions, paiements réussis) pour le dashboard admin.

### Accessibilité
- **NFR-12 :** Conformité WCAG 2.1 niveau AA pour les parcours critiques (inscription, forum, candidature).

### Stockage fichiers
- **NFR-13 :** Assets médias (avatars, CV) stockés dans Cloudflare R2 (0 $ d'egress, compatible S3). (ADR-04) Taille max : 5 MB par fichier.

---

## 8. Métriques de succès

**Primaires**
- **SM-1 :** 50 membres inscrits et actifs (≥ 1 question ou réponse) à la bêta fermée (fin Sprint 8). Valide FR-4 à FR-7.
- **SM-2 :** 100+ questions publiées avec au moins 1 réponse dans les 30 jours post-bêta. Valide FR-12 à FR-15.
- **SM-3 :** 1 paiement Wave réussi en production (end-to-end webhook confirmé). Valide FR-36.
- **SM-4 :** Score Lighthouse Performance > 75 en 3G dès Phase 1 (objectif > 85 en Phase 2). Valide NFR-3.

**Secondaires**
- **SM-5 :** 10+ offres d'emploi publiées avec salaire dans les 60 jours post-lancement. Valide FR-28.
- **SM-6 :** 5+ projets soumis avec stats GitHub importées. Valide FR-22 à FR-23.
- **SM-7 :** Taux de questions avec réponse acceptée > 30 % après 30 jours. Valide FR-17.

**Contre-métriques (ne pas optimiser)**
- **SM-C1 :** Taux de signalement de contenu (ne pas pousser le volume de questions au détriment de la qualité). Contre-balance SM-2.
- **SM-C2 :** Temps passé sur la plateforme (ne pas optimiser l'engagement compulsif). L'objectif est l'utilité, pas la rétention addictive.

---

## 9. Questions ouvertes

1. **Orange Money Phase 1 :** La disponibilité de l'API sandbox Orange Money Sénégal/CI est-elle confirmée avant le Sprint 7 ? Si non, Orange Money glisse en Phase 2 et seul Wave + Stripe sont en Phase 1.
2. **Langue de l'interface :** L'interface v1 est-elle intégralement en français, ou bilingue FR/EN dès le lancement ? Impact sur les chaînes de traduction et le contenu du design system.
3. **Modération :** Quel est le seuil de signalements pour qu'un contenu soit auto-masqué (sans intervention humaine) ? À définir avant le Sprint 7 (FR-20, FR-21).
4. **MTN MoMo Phase 1 :** L'intégration MTN MoMo est-elle réalisable en Phase 1 si le partenariat est signé avant S6 ? `[ASSUMPTION: MTN MoMo reste Phase 2 faute de confirmation.]`
5. **Conformité RGPD/CNIL :** AfriDev Hub collecte des données de résidents UE potentiels (diaspora africaine en France). Une analyse RGPD est-elle requise avant le lancement public ?
6. **Recruteur sans compte :** Le recruteur doit-il obligatoirement créer un compte Membre avant de publier une offre, ou existe-t-il un flow recruteur séparé ?
7. **Taux de change :** Quel fournisseur de taux de change (FR-30) ? Fréquence de mise à jour (quotidienne, hebdomadaire) ? Quel comportement si l'API est indisponible (cache stale acceptable) ?
8. **Stripe en Phase 1 :** Stripe est intégré pour le fallback paiement. Est-il aussi utilisé pour le plan recruteur premium (FR-34), ou uniquement pour la Phase 2 (sessions mentorat) ?

---

## 10. Index des hypothèses

- **§4.4 FR-27** — Seuil de score de spam pour la vitrine à définir.
- **§4.5 FR-29** — Taux de change via API publique (ExchangeRate-API), rafraîchi quotidiennement.
- **§4.5 FR-34** — Paiement plan recruteur premium via PaymentProvider (Wave/Stripe).
- **§6.2** — Orange Money Phase 1 si accès sandbox avant S7, sinon Phase 2.
- **§6.2** — MTN MoMo reste Phase 2 faute de confirmation partenariat.
- **§7 NFR-8** — Pas de HA Phase 1 (mono-instance Systalink).
- **§7 NFR-9** — PM2 utilisé pour le process management Systalink.
- **§7 NFR-10** — Outil monitoring à choisir (Sentry ou équivalent gratuit).
