# AfriDev Hub — Présentation complète du projet

*Vision, thème, fonctionnalités, architecture, état d'avancement et défis. Rédigé le 29 octobre 2026.*

---

## 1. En une phrase

**AfriDev Hub est la plateforme d'échange africaine pour les développeurs, faite par des développeurs** : un seul endroit pour poser des questions techniques, montrer ses projets, trouver un emploi avec un salaire affiché, et plus tard se faire accompagner par un mentor, avec des paiements adaptés au continent.

---

## 2. Le thème : « Construire la plateforme d'échange africaine, pour les devs, par les devs »

Le thème tient en trois idées. Voici comment le projet répond à chacune.

### 2.1 « La plateforme d'échange »

Un échange, ce n'est pas un annuaire : c'est de la matière qui circule dans les deux sens. AfriDev Hub organise quatre échanges :

| Échange | Ce qui circule | Fonctionnalité |
|---|---|---|
| **De connaissances** | Questions et réponses | Forum Q&A, votes, réponse acceptée |
| **De réalisations** | Projets et code | Vitrine de projets reliée à GitHub |
| **D'opportunités** | Offres et candidatures | Job board avec salaire obligatoire |
| **D'expertise** | Conseils et accompagnement | Mentorat payant 1-à-1 (Phase 2) |

Et une monnaie commune à ces échanges : la **réputation**. Elle se gagne en aidant, se lit sur le profil, et rassure un recruteur.

### 2.2 « Africaine »

Le projet part des réalités du continent au lieu d'adapter à la hâte un produit étranger :

- **Langue** : interface en français d'abord, recherche qui ignore les accents.
- **Géographie** : 69 pays, les 54 pays africains et 15 pays de la diaspora.
- **Argent** : salaires affichés dans la devise du lecteur, paiement par mobile money via un agrégateur.
- **Connexion** : conception pensée pour une connexion lente, application installable et hors connexion prévue en Phase 2.
- **Marché** : offres ciblant les marchés régionaux, avec salaire transparent, ce qui est rare.

### 2.3 « Pour les devs »

Chaque choix de produit sert un besoin concret d'un développeur :

| Profil | Ce qu'il cherche | Ce que la plateforme lui apporte |
|---|---|---|
| **Développeur junior** | Débloquer un problème, être repéré, trouver un premier poste | Réponses rapides, réputation visible, offres avec salaire |
| **Développeur senior / mentor** | Partager, gagner en visibilité, compléter ses revenus | Profil reconnu, projets mis en avant, mentorat payant |
| **Recruteur / startup** | Recruter localement à coût maîtrisé | Offres ciblées, profils vérifiés, candidatures avec CV |
| **Utilisateur en zone peu connectée** | Lire et contribuer malgré une connexion instable | Application installable, lecture hors connexion (Phase 2) |

### 2.4 « Par les devs »

Deux sens :

- **Une plateforme construite par des développeurs**, avec les exigences que cela implique : code testé, contrôles de qualité à chaque modification, documentation d'API interactive, aucune fuite de secrets.
- **Une plateforme dont le contenu vient des développeurs**, pas d'une rédaction : ce sont les membres qui répondent, votent, modèrent et publient. La communauté se régule elle-même (réputation, signalements, modérateurs issus des membres).

---

## 3. Les fonctionnalités

### 3.1 Compte, profil et réputation

- **Inscription par email** avec **code de vérification à 6 caractères** : le compte ne peut pas se connecter tant que l'email n'est pas confirmé. Parcours : inscription, saisie du code reçu par email, puis connexion.
- **Connexion GitHub et Google** (OAuth). Un compte n'est jamais lié automatiquement à un autre : si l'email existe déjà, l'utilisateur confirme avec son mot de passe.
- **Onboarding guidé** : pays, stack principale, niveau.
- **Profil public** à une adresse du type `/@pseudo`, lisible sans connexion, avec métadonnées de partage pour les réseaux sociaux.
- **Badge « vérifié »** attribué automatiquement quand le profil est complet (email confirmé, pays, stack, bio d'au moins 50 caractères, un lien externe) et retiré si une condition disparaît.
- **Réputation en temps réel**, notifiée à l'écran sans recharger la page :

| Événement | Points |
|---|---|
| Question posée | +5 |
| Réponse donnée | +10 |
| Vote positif reçu | +10 |
| Vote négatif reçu | −2 |
| Réponse acceptée | +15 |

### 3.2 Forum de questions-réponses

C'est le cœur de la plateforme.

- Questions en **Markdown** avec 1 à 5 tags, prévisualisation en direct.
- **Détection de doublons** avant publication : les 3 questions les plus proches du titre sont proposées.
- **Réponses**, **votes** (réservés aux membres ayant au moins 10 points de réputation) et **réponse acceptée** par l'auteur de la question.
- **Recherche plein texte** qui ignore les accents, avec tri par pertinence.
- Tris : plus votées, plus actives, plus récentes, sans réponse.
- **Notifications** à l'écran et par email (nouvelle réponse, vote, réponse acceptée). L'utilisateur peut désactiver les emails.
- **Signalement et modération** : un membre ne signale un contenu qu'une fois ; à **3 signalements** le contenu est masqué automatiquement ; un modérateur peut masquer, restaurer ou rejeter. Chaque action est tracée dans un journal d'audit.

### 3.3 Vitrine de projets

- Soumission d'un projet avec lien GitHub vérifié auprès de GitHub.
- **Import automatique** des étoiles, du langage et des dates.
- **Vérification de propriété** : un badge à placer dans le dépôt et des contrôles automatiques, pour éviter qu'on s'attribue le travail d'un autre.
- Filtres par catégorie, stack et pays ; **étoiles** de la communauté ; adresse de page lisible ; aperçu de partage.
- **Actualisation** des statistiques chaque nuit et à la demande, avec un délai minimum d'une heure entre deux demandes.
- Masquage des projets signalés, comme pour le forum.

### 3.4 Job board

- Publication d'offres avec **salaire obligatoire**, pays, mode (sur site, hybride, télétravail) et stack.
- **Validation avant publication** : une offre est relue et approuvée ou refusée avec un motif.
- **Conversion de devises** : le salaire est affiché dans la devise du lecteur, avec des taux mis à jour chaque jour.
- **Candidature directe** avec CV optionnel, envoyé de façon sécurisée vers un stockage dédié.
- **Alertes email** : immédiates, et un résumé hebdomadaire.
- **Expiration automatique** à 60 jours, avec rappel au 50ᵉ jour et possibilité de renouveler.
- **Plan gratuit** : 3 offres par mois. **Plan premium** pour les recruteurs, payé en ligne.

### 3.5 Paiements

- Un **agrégateur unique, Bictorys**, couvre les moyens de paiement mobiles ; aucun code spécifique à chaque opérateur.
- Un paiement n'est jamais cru sur parole : la notification de l'opérateur est vérifiée (signature, montant, devise) puis **confirmée auprès de l'agrégateur** avant d'être validée.
- Une **réconciliation planifiée** rattrape les paiements dont la notification s'est perdue.
- Un paiement ne peut être honoré qu'une seule fois.
- **Reçu par email** après chaque paiement.

### 3.6 Administration, qualité et emails

- **Tableau de bord administrateur** : membres, contenus, indicateurs du forum (taux de questions avec réponse acceptée).
- **Emails** avec une mise en page commune AfriDev Hub (vérification, notifications, alertes emploi, rappels, reçus), envoyés depuis un domaine vérifié.
- **Documentation d'API interactive** (Swagger), avec connexion GitHub et Google intégrée pour tester.
- **Liste des pays** exposée pour les listes déroulantes du front, avec code à 2 lettres.

### 3.7 Prévu en Phase 2

| Fonctionnalité | Contenu |
|---|---|
| **Mentorat 1-à-1** | Profil de mentor validé par un administrateur, réservation d'un créneau, paiement pré-autorisé puis capturé, rappel avant la séance, évaluation |
| **Application web installable, hors connexion** | Lecture du forum sans réseau, actions synchronisées au retour de la connexion |
| **Groupes et communautés** | Groupes publics ou privés, publications, événements, rôles |

**Hors périmètre volontairement** pour le MVP : messagerie privée, vidéo intégrée, application native, API publique, tests de compétences.

---

## 4. Comment c'est construit

| Couche | Choix |
|---|---|
| Organisation du code | Monorepo Nx |
| API | NestJS 10, REST et temps réel (WebSocket) |
| Front | Angular 18 |
| Base de données | PostgreSQL via Prisma 5, hébergée sur Neon |
| Cache et sessions | Redis |
| Fichiers (avatars, CV) | Cloudflare R2, avec URL pré-signées |
| Hébergement de l'API | Web sans Server de Systalink , avec déploiement automatique à chaque fusion sur `main` |
| Emails | Resend, depuis un domaine vérifié |
| Paiement | Bictorys |
| Qualité | SonarQube Cloud et GitGuardian sur chaque PR, environ 300 tests automatisés | 

Quelques principes d'architecture :

- les modules métier ne s'appellent pas entre eux : ils communiquent par **événements** (`forum.answer.accepted`, `votes.vote.changed`, `auth.email.verified`…), ce qui permet d'ajouter une fonctionnalité sans toucher aux autres ;
- seul le module de gamification écrit la réputation ;
- toutes les réponses d'erreur suivent un format unique avec des codes lisibles par le front ;
- les montants sont stockés en entiers (jamais en décimaux) ;
- le jeton d'accès est court (15 minutes), le jeton de renouvellement est révocable ; un bannissement prend effet immédiatement.

---

## 5. Où en est le projet

| Domaine | État |
|---|---|
| Authentification, profils, réputation, badges | **Terminé** côté API |
| Forum, modération, notifications | **Terminé** côté API |
| Vitrine de projets | **Terminé** côté API |
| Job board | **Terminé** côté API |
| Paiements (abonnement recruteur premium) | **Terminé**, il reste un essai réel en bac à sable chez l'agrégateur |
| Envoi d'emails | **Fonctionnel** depuis le domaine vérifié |
| Documentation d'API | **À jour** |
| **Interface web (Angular)** | **Presque tout reste à faire** (une branche d'import du front est en cours) |
| Mentorat, hors connexion, groupes | **Phase 2** |

En clair : **le moteur fonctionne et est en ligne** ; ce qu'on ne voit pas encore, c'est la partie que l'utilisateur touche. C'est le chantier principal à venir : pages d'inscription, de vérification du code et de connexion, puis forum, projets, offres.

---

## 6. Le défi : construire ce genre de plateforme dans l'écosystème dev africain

> Cette partie est une **analyse**, pas une étude chiffrée. Les points sont des constats de terrain et des raisonnements ; les chiffres de marché ne sont pas cités faute de source vérifiée dans le projet.

### 6.1 L'œuf et la poule

Un forum vide ne sert à rien, et personne ne vient dans un forum vide. Il faut des **premières questions avec de vraies réponses** avant que la plateforme ait une valeur propre. Le projet vise 50 membres actifs puis 100 questions répondues en 30 jours après la bêta. C'est modeste, volontairement : mieux vaut une petite communauté vivante qu'une grande vitrine vide.

### 6.2 Concurrencer des habitudes plus que des produits

Les développeurs africains ont déjà des habitudes : groupes WhatsApp et Telegram, LinkedIn, Stack Overflow, GitHub. Le vrai concurrent est **l'habitude**. La plateforme doit apporter ce que ces outils ne donnent pas :

- une **mémoire** : une réponse trouvée dans un groupe WhatsApp se perd en quelques jours ; ici elle reste recherchable ;
- une **réputation portable** que les recruteurs locaux peuvent lire ;
- un contexte **local** (langue, devises, marché).

### 6.3 L'intelligence artificielle change la donne

Les assistants de code répondent aujourd'hui à beaucoup de questions techniques, en français aussi. Un forum ne peut plus se justifier uniquement par « obtenir une réponse ». Sa valeur se déplace vers ce qu'une IA ne remplace pas : **le contexte local, le jugement d'un pair, la réputation, le réseau, l'emploi, le mentorat**. C'est une raison de plus de ne pas faire du forum la seule pièce du produit, et c'est le sens du mot « échange » dans le thème.

### 6.4 Les paiements : une mosaïque

Dans de nombreux pays, le paiement se fait par mobile money, avec des opérateurs différents selon la région, et la carte bancaire internationale est peu répandue. Intégrer chaque opérateur coûte cher et ralentit. **Le choix d'un agrégateur unique** réduit cette complexité, au prix d'une dépendance à un seul prestataire. Autres difficultés : confirmations de paiement qui arrivent en retard ou jamais (d'où la double vérification et la réconciliation), et remboursements, repoussés à plus tard.

### 6.5 Une monnaie par pays

Afficher un salaire dans la devise du lecteur est simple en théorie. En pratique : plusieurs devises, des taux qui bougent, des devises dont les taux sont peu fiables ou parfois bloqués. La plateforme affiche **une conversion indicative**, mise à jour chaque jour, et garde la devise d'origine de l'offre comme référence.

### 6.6 La connexion et les appareils

Une page lourde est une page que l'on n'ouvre pas. Les objectifs fixés (page initiale légère, bon score en 3G simulé, lecture hors connexion) sont des **choix de produit**, pas des raffinements. Ils sont reportés en Phase 2, ce qui est un risque : plus on attend, plus il est coûteux de rendre le front léger après coup.

### 6.7 La confiance et la modération

Une communauté de 54 pays, avec des langues, des cultures et des sensibilités différentes, doit être modérée sans moyens importants. Le choix retenu : **le masquage automatique après 3 signalements**, puis une décision humaine, avec un journal d'audit. Le danger inverse existe : des signalements abusifs pour faire taire quelqu'un. D'où la règle d'un seul signalement par membre et la restauration possible.

La **vérification de l'identité** est un autre point : un email confirmé prouve peu. Le badge « vérifié » combine plusieurs critères, mais ne garantit pas une identité réelle. Il faudra le faire évoluer.

### 6.8 Un modèle économique avec un pouvoir d'achat limité

Les revenus prévus : abonnement recruteur premium (5 000 XOF pour 30 jours), mentorat avec commission. Le risque : des recruteurs et des développeurs peu enclins à payer au démarrage. La plateforme doit prouver sa valeur gratuitement (1 offres par mois, forum ouvert) avant de demander de payer. Les coûts d'infrastructure restent à surveiller, d'où des choix à faible coût (stockage sans frais de sortie, offres gratuites des hébergeurs en bêta).

### 6.9 Fiabilité de l'infrastructure

Une plateforme qui s'adresse à une région où l'accès est déjà fragile doit elle-même tenir : emails qui partent, paiements confirmés, site disponible. Deux incidents récents l'ont montré. Les enregistrements DNS qui prouvent le domaine d'envoi ont disparu, et plus aucun email de vérification ne partait. Un changement de règle de vérification a bloqué la connexion des comptes existants. Ces incidents sont normaux à ce stade, mais ils appellent de la **supervision** (alertes sur les échecs d'envoi, suivi des erreurs) plus tôt que prévu.

### 6.10 Le risque de la fuite des talents

Le job board met en relation des développeurs africains avec des employeurs. Si les meilleures offres viennent de l'étranger, la plateforme peut accélérer le départ des talents au lieu de nourrir l'écosystème local. À l'inverse, le télétravail pour des employeurs étrangers est aussi une source de revenus pour les développeurs. Ce n'est pas un problème à résoudre, c'est un équilibre à **piloter** : filtre par pays, mise en avant des employeurs locaux.

### 6.11 Ce qui rend le projet crédible malgré ces défis

- une **ambition réaliste** : une Phase 1 limitée (forum, vitrine, offres, paiements), la Phase 2 seulement ensuite ;
- une **base technique solide** : événements, vérification des paiements, tests, contrôles de qualité à chaque modification ;
- une **vérité sur l'état du produit** : le moteur est en ligne, l'interface reste à faire ;
- une **lecture locale** des besoins (langue, devises, paiement mobile, connexion) plutôt qu'une copie d'un produit étranger.

---

## 7. Indicateurs de succès

| Indicateur | Cible |
|---|---|
| Membres actifs à la bêta fermée | 50 |
| Questions publiées avec au moins une réponse, 30 jours après la bêta | 100 et plus |
| Premier paiement mobile réussi de bout en bout en production | 1 |
| Courbe de réputation, offres publiées, candidatures | à suivre dans le tableau de bord admin |

---

## 8. Prochaines étapes recommandées

1. **Construire le parcours d'entrée du front** : inscription, page du code de vérification, connexion. L'API est prête pour ce parcours.
2. **Faire un essai réel de paiement en bac à sable** chez l'agrégateur.
3. **Ajouter de la supervision** : alertes sur les échecs d'envoi d'emails et suivi des erreurs en production.
4. **Amorcer la communauté** : inviter 20 à 30 développeurs et seeder quelques questions réelles avant d'ouvrir plus largement.
5. **Préparer la Phase 2** : mentorat, puis application installable et hors connexion.

---

*Sources : PRD (`apps/api/_bmad-output/prd-afridev-hub/`), contrat de données, README et historique du dépôt.*
