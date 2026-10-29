/**
 * Contenu de démonstration supplémentaire : questions et réponses, projets, offres d'emploi.
 * Ne crée, ne modifie et ne supprime AUCUN compte : le contenu est attribué aux membres de démonstration
 * déjà présents (voir seed-demo.ts). Lancer : npm run prisma:seed:demo:content
 *
 * Idempotent : chaque ligne a un identifiant ou une clé unique fixe (préfixe « demo2- »), un second passage met à jour.
 * Les offres sont datées avant le début du mois : elles ne consomment pas le quota gratuit des recruteurs.
 */
import { PrismaClient, JobMode, JobType } from '@prisma/client';

const prisma = new PrismaClient();

const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);

const USD_PER_UNIT: Record<string, number> = { XOF: 1 / 600, XAF: 1 / 600, NGN: 1 / 1500, GHS: 1 / 15, KES: 1 / 130, EUR: 1.08, USD: 1 };
const toUsd = (amount: number, currency: string) => Math.round(amount * (USD_PER_UNIT[currency] ?? 0));

const MEMBERS = ['aminata_dev', 'chidi_codes', 'fatou_ml', 'modo_koffi'];
const RECRUITERS = ['wave_recruiter', 'gozem_talent'];

interface AnswerSeed { author: string; ageDays: number; voteScore: number; accepted?: boolean; body: string }
interface PostSeed {
  id: string; author: string; ageDays: number; resolved: boolean; voteScore: number; views: number;
  title: string; body: string; tags: string[]; answers: AnswerSeed[];
}

// Vingt-trois conseils distincts pour la question qui sert à montrer la pagination des réponses (10 par page).
const CACHE_TIPS: string[] = [
  'Mettez en place des en-têtes ETag et Cache-Control : le client renvoie If-None-Match et l\'API répond 304 sans corps, ce qui économise beaucoup de données.',
  'Activez la compression Brotli ou gzip pour toutes les réponses JSON : sur du texte, on gagne facilement 70 % de volume.',
  'Paginez toutes les listes et limitez la taille par défaut : une réponse de 20 éléments passe là où une réponse de 2 000 échoue.',
  'Utilisez le stale-while-revalidate côté client : on affiche tout de suite la dernière version connue et on rafraîchit en arrière-plan.',
  'Un service worker avec une stratégie « réseau d\'abord, cache en secours » garde l\'application utilisable quand la connexion tombe.',
  'Stockez les lectures dans IndexedDB plutôt que dans localStorage : c\'est asynchrone et la limite de taille est bien plus confortable.',
  'Retournez uniquement les champs utiles (sélection de champs ou GraphQL) : les objets complets coûtent cher sur un réseau instable.',
  'Mettez les écritures dans une file locale avec une clé d\'idempotence : on rejoue à la reconnexion sans risque de doublon.',
  'Mettez un CDN devant les ressources publiques, avec un point de présence proche de vos utilisateurs (Lagos, Johannesburg, Nairobi).',
  'Utilisez HTTP/2 ou HTTP/3 : une seule connexion multiplexée évite de payer plusieurs poignées de main TLS sur un lien lent.',
  'Réduisez les images : WebP ou AVIF, tailles adaptées à l\'écran et chargement différé hors de la zone visible.',
  'Évitez les requêtes en cascade : regroupez-les dans un seul endpoint ou lancez-les en parallèle plutôt qu\'à la suite.',
  'Gérez les délais d\'attente et les reprises avec un backoff exponentiel et un peu d\'aléa pour ne pas saturer l\'API au retour du réseau.',
  'Mesurez sur de vrais appareils bridés : le mode « 3G lent » de Chrome DevTools montre vite ce qui coûte trop cher.',
  'Mettez en cache les réponses coûteuses côté serveur dans Redis avec une durée courte, et invalidez à l\'écriture plutôt qu\'à l\'heure.',
  'Utilisez des identifiants de ressource stables et des mises à jour partielles (PATCH) pour ne pas renvoyer tout l\'objet à chaque modification.',
  'Préchargez la page suivante quand l\'utilisateur approche de la fin de la liste : la navigation paraît instantanée.',
  'Affichez un état hors ligne explicite et ce qui est en attente d\'envoi : l\'utilisateur comprend et ne recommence pas dix fois.',
  'Évitez les WebSockets permanents sur mobile si la fraîcheur n\'est pas critique : un sondage espacé consomme moins de batterie et de données.',
  'Versionnez vos réponses en cache : un numéro de version dans la clé évite de servir un format périmé après un déploiement.',
  'Réduisez les cookies et en-têtes superflus : sur des milliers de petites requêtes, quelques centaines d\'octets d\'en-têtes pèsent lourd.',
  'Testez le cas « réponse partielle » : coupez la connexion en plein transfert et vérifiez que le client sait reprendre ou recommencer proprement.',
  'Gardez un budget de poids par page (par exemple 300 Ko) vérifié en intégration continue : on voit tout de suite la régression.',
];

const POSTS: PostSeed[] = [
  {
    id: 'demo2-post-1', author: 'chidi_codes', ageDays: 14, resolved: true, voteScore: 31, views: 640,
    title: 'Quelle stratégie de cache pour une API consultée depuis des réseaux 3G instables ?',
    body: 'Notre application mobile est utilisée par des commerçants dont la connexion saute plusieurs fois par jour. L\'API renvoie des listes de produits et de commandes, parfois lourdes. Quelles techniques de cache, de compression et de reprise avez-vous mises en place pour que l\'expérience reste fluide ? Je cherche des retours concrets plus que de la théorie.',
    tags: ['api', 'performance', 'architecture'],
    answers: CACHE_TIPS.map((body, index): AnswerSeed => ({
      author: ['aminata_dev', 'fatou_ml', 'modo_koffi', 'aminata_dev'][index % 4],
      ageDays: 13 - Math.floor(index / 2),
      voteScore: index === 0 ? 18 : Math.max(0, 12 - index),
      accepted: index === 3,
      body,
    })),
  },
  {
    id: 'demo2-post-2', author: 'fatou_ml', ageDays: 12, resolved: true, voteScore: 9, views: 175,
    title: 'Comment structurer un projet NestJS en modules sans dépendances circulaires ?',
    body: 'Mon API NestJS grossit et je me retrouve avec des imports circulaires entre le module des utilisateurs et celui des commandes. Quelle organisation recommandez-vous pour garder des modules indépendants ?',
    tags: ['nestjs', 'architecture', 'typescript'],
    answers: [
      { author: 'chidi_codes', ageDays: 11, voteScore: 8, accepted: true, body: 'Découplez avec des événements (EventEmitter) : le module des commandes émet « commande créée » et celui des utilisateurs s\'abonne, sans s\'importer mutuellement. Gardez les dépendances à sens unique.' },
      { author: 'aminata_dev', ageDays: 11, voteScore: 3, body: 'Sortez le code partagé (types, utilitaires) dans une bibliothèque commune. Et si deux modules ont vraiment besoin l\'un de l\'autre, c\'est souvent le signe qu\'un troisième module manque.' },
    ],
  },
  {
    id: 'demo2-post-3', author: 'aminata_dev', ageDays: 10, resolved: false, voteScore: 6, views: 120,
    title: 'Tests e2e Angular : Playwright ou Cypress en 2026 ?',
    body: 'Nous démarrons une suite de tests de bout en bout pour une application Angular 18. Playwright ou Cypress ? Je m\'intéresse surtout à la stabilité, à la vitesse en CI et au support de plusieurs navigateurs.',
    tags: ['angular', 'tests', 'typescript'],
    answers: [
      { author: 'modo_koffi', ageDays: 9, voteScore: 5, body: 'Playwright : plusieurs navigateurs, exécution en parallèle et attentes automatiques très fiables. En CI, le gain de temps est net. Cypress reste agréable pour le débogage interactif.' },
      { author: 'chidi_codes', ageDays: 9, voteScore: 2, body: 'Peu importe l\'outil, isolez vos données de test et nettoyez-les à la fin : c\'est la première cause de tests instables.' },
      { author: 'fatou_ml', ageDays: 8, voteScore: 1, body: 'Je confirme pour Playwright. Pensez à l\'option de trace : en cas d\'échec en CI, on rejoue le scénario pas à pas.' },
    ],
  },
  {
    id: 'demo2-post-4', author: 'modo_koffi', ageDays: 9, resolved: false, voteScore: 11, views: 310,
    title: 'Comment convaincre une équipe de passer à TypeScript strict sans tout casser ?',
    body: 'Notre base de code JavaScript migre vers TypeScript, mais le mode strict déclenche des milliers d\'erreurs. Comment avancer sans bloquer l\'équipe ni livrer plus lentement ?',
    tags: ['typescript', 'carriere', 'architecture'],
    answers: [
      { author: 'aminata_dev', ageDays: 8, voteScore: 7, body: 'Activez les options strictes une par une (noImplicitAny d\'abord), par dossier, avec une liste d\'exclusions qui rétrécit chaque semaine. Aucun fichier nouveau ne doit entrer en non strict.' },
    ],
  },
  {
    id: 'demo2-post-5', author: 'fatou_ml', ageDays: 8, resolved: false, voteScore: 5, views: 95,
    title: 'Débuter en machine learning avec peu de données en langues africaines',
    body: 'Je veux entraîner un petit modèle de classification de texte en wolof et en bambara, mais je n\'ai que quelques milliers de phrases. Quelles approches (transfert, augmentation de données) donnent de bons résultats avec si peu de matière ?',
    tags: ['python', 'nlp', 'debutant'],
    answers: [
      { author: 'chidi_codes', ageDays: 7, voteScore: 4, body: 'Partez d\'un modèle multilingue déjà pré-entraîné et affinez-le sur vos phrases : le transfert fait l\'essentiel. Les corpus ouverts de la communauté Masakhane sont un bon point de départ.' },
    ],
  },
  {
    id: 'demo2-post-6', author: 'chidi_codes', ageDays: 7, resolved: true, voteScore: 13, views: 260,
    title: 'PostgreSQL : index partiel ou index composite pour filtrer sur un statut ?',
    body: 'Ma table de commandes contient 90 % de lignes « terminées ». Mes requêtes ne ciblent presque que les commandes en cours. Un index partiel sur le statut est-il préférable à un index composite ?',
    tags: ['postgresql', 'performance', 'api'],
    answers: [
      { author: 'aminata_dev', ageDays: 6, voteScore: 9, accepted: true, body: 'Oui, un index partiel (WHERE statut = \'EN_COURS\') est bien plus petit et rapide quand la majorité des lignes ne vous intéresse pas. Vérifiez avec EXPLAIN que le planificateur l\'utilise.' },
      { author: 'modo_koffi', ageDays: 6, voteScore: 2, body: 'Gardez l\'index composite si vous filtrez aussi sur la date : l\'index partiel doit porter les colonnes de tri pour éviter un tri en mémoire.' },
    ],
  },
  {
    id: 'demo2-post-7', author: 'aminata_dev', ageDays: 6, resolved: false, voteScore: 2, views: 60,
    title: 'Flutter ou React Native pour une application utilisée hors ligne ?',
    body: 'Nous construisons une application pour agents de terrain, souvent sans réseau. Flutter ou React Native pour la synchronisation locale et la fluidité sur des téléphones d\'entrée de gamme ?',
    tags: ['flutter', 'mobile', 'architecture'],
    answers: [],
  },
  {
    id: 'demo2-post-8', author: 'modo_koffi', ageDays: 5, resolved: false, voteScore: 8, views: 150,
    title: 'Docker en production sur un petit serveur : bonnes pratiques de sécurité',
    body: 'Je déploie plusieurs conteneurs sur un seul serveur loué. Quelles règles minimales appliquer (utilisateur non root, secrets, mises à jour d\'images) pour ne pas se faire compromettre ?',
    tags: ['docker', 'securite', 'devops'],
    answers: [
      { author: 'chidi_codes', ageDays: 4, voteScore: 6, body: 'Exécutez les conteneurs en utilisateur non root, avec un système de fichiers en lecture seule quand c\'est possible. Ne mettez jamais de secrets dans l\'image : passez-les à l\'exécution.' },
      { author: 'fatou_ml', ageDays: 4, voteScore: 2, body: 'Analysez vos images avec un scanner de vulnérabilités en CI et reconstruisez-les régulièrement : une image figée accumule les failles connues.' },
    ],
  },
  {
    id: 'demo2-post-9', author: 'chidi_codes', ageDays: 4, resolved: false, voteScore: 3, views: 70,
    title: 'Retour d\'expérience : intégrer trois fournisseurs Mobile Money dans la même API',
    body: 'Nous venons d\'unifier Orange Money, Wave et MTN MoMo derrière une seule interface. Je partage l\'architecture (adaptateurs, machine à états des paiements) et les pièges de la réconciliation. Vos retours sont bienvenus.',
    tags: ['paiements-afrique', 'architecture', 'api'],
    answers: [],
  },
  {
    id: 'demo2-post-10', author: 'fatou_ml', ageDays: 3, resolved: false, voteScore: 1, views: 40,
    title: 'Comment préparer un entretien technique quand on est autodidacte ?',
    body: 'Je me suis formée seule et je commence à passer des entretiens. Quels sujets prioriser pour ne pas me sentir en retard face aux diplômés en informatique ?',
    tags: ['carriere', 'debutant'],
    answers: [
      { author: 'aminata_dev', ageDays: 2, voteScore: 4, body: 'Maîtrisez bien les bases (structures de données simples, complexité, SQL) et surtout montrez des projets réels : une démo en ligne vaut mieux qu\'un diplôme pour beaucoup d\'équipes.' },
    ],
  },
  {
    id: 'demo2-post-11', author: 'aminata_dev', ageDays: 2, resolved: false, voteScore: 0, views: 25,
    title: 'Gérer les fuseaux horaires et les devises dans une application panafricaine',
    body: 'Nos utilisateurs sont répartis entre l\'Afrique de l\'Ouest, centrale et orientale. Comment stocker et afficher dates et montants sans erreur, avec des devises comme le XOF, le NGN ou le KES ?',
    tags: ['api', 'architecture', 'postgresql'],
    answers: [],
  },
  {
    id: 'demo2-post-12', author: 'modo_koffi', ageDays: 1, resolved: false, voteScore: 0, views: 12,
    title: 'Quels sont vos outils pour suivre les erreurs en production ?',
    body: 'Nous cherchons un moyen simple de remonter les erreurs de notre API et de notre application web. Quels services ou outils utilisez-vous, et comment organisez-vous les alertes pour éviter la fatigue ?',
    tags: ['devops', 'api'],
    answers: [],
  },
];

const PROJECTS = [
  { slug: 'momo-checker', name: 'MoMo Checker', author: 'chidi_codes', country: 'CI', category: 'fintech', tags: ['nodejs', 'paiements-afrique', 'typescript'], stars: 74, forks: 11, language: 'TypeScript',
    repoUrl: 'https://github.com/demo-afridev/momo-checker', demoUrl: 'https://momo-checker.example.com',
    description: 'Outil en ligne de commande et bibliothèque qui vérifient l\'état d\'une transaction Mobile Money auprès de plusieurs opérateurs et signalent les écarts avec votre base.' },
  { slug: 'sante-rurale-pwa', name: 'Santé Rurale', author: 'aminata_dev', country: 'SN', category: 'healthtech', tags: ['angular', 'typescript', 'pwa'], stars: 41, forks: 5, language: 'TypeScript',
    repoUrl: 'https://github.com/demo-afridev/sante-rurale-pwa', demoUrl: null,
    description: 'Application web progressive pour les agents de santé communautaires : fiches patients hors ligne, rappels de vaccination et synchronisation à la reconnexion.' },
  { slug: 'afri-learn-cli', name: 'Afri Learn CLI', author: 'fatou_ml', country: 'KE', category: 'edtech', tags: ['python', 'debutant'], stars: 33, forks: 6, language: 'Python',
    repoUrl: 'https://github.com/demo-afridev/afri-learn-cli', demoUrl: null,
    description: 'Parcours d\'apprentissage de la programmation dans le terminal, en français et en anglais, avec exercices corrigés automatiquement et suivi de progression.' },
  { slug: 'marche-local-api', name: 'Marché Local API', author: 'modo_koffi', country: 'GH', category: 'ecommerce', tags: ['nestjs', 'postgresql', 'api'], stars: 52, forks: 9, language: 'TypeScript',
    repoUrl: 'https://github.com/demo-afridev/marche-local-api', demoUrl: 'https://marche-local.example.com',
    description: 'API de catalogue et de commandes pour petits commerçants : produits, stocks, paiements à la livraison et notifications par SMS.' },
  { slug: 'ussd-gateway', name: 'USSD Gateway', author: 'chidi_codes', country: 'CM', category: 'api-backend', tags: ['golang', 'api'], stars: 19, forks: 2, language: 'Go',
    repoUrl: 'https://github.com/demo-afridev/ussd-gateway', demoUrl: null,
    description: 'Passerelle USSD légère pour exposer des services web aux téléphones sans internet : menus configurables, sessions et connecteurs vers vos API.' },
];

const JOBS = [
  { id: 'demo2-job-1', recruiter: 'wave_recruiter', company: 'Wave Mobile Money', title: 'Ingénieur·e DevOps', country: 'CI', mode: JobMode.HYBRID, type: JobType.FULL_TIME,
    currency: 'XOF', min: 1_400_000, max: 2_000_000, stack: ['Kubernetes', 'Terraform', 'PostgreSQL'], publishedDaysAgo: 35,
    description: 'Vous fiabilisez l\'infrastructure qui traite des millions de transactions : déploiements automatisés, supervision, gestion des incidents et optimisation des coûts. Vous travaillez avec les équipes backend pour réduire les temps de reprise et améliorer la disponibilité du service dans toute la région.' },
  { id: 'demo2-job-2', recruiter: 'gozem_talent', company: 'Gozem', title: 'Développeur·se Mobile Flutter', country: 'TG', mode: JobMode.REMOTE, type: JobType.FULL_TIME,
    currency: 'EUR', min: 1800, max: 2600, stack: ['Flutter', 'Dart', 'Firebase'], publishedDaysAgo: 38,
    description: 'Vous concevez et faites évoluer l\'application de transport et de livraison utilisée chaque jour par des milliers de clients et de chauffeurs. Performance sur téléphones d\'entrée de gamme, mode hors ligne et accessibilité font partie de vos priorités. Travail à distance depuis un pays africain.' },
  { id: 'demo2-job-3', recruiter: 'wave_recruiter', company: 'Wave Mobile Money', title: 'Data Engineer', country: 'SN', mode: JobMode.ONSITE, type: JobType.FULL_TIME,
    currency: 'XOF', min: 1_300_000, max: 1_900_000, stack: ['Python', 'SQL', 'Airflow'], publishedDaysAgo: 41,
    description: 'Vous construisez les pipelines de données qui alimentent la lutte contre la fraude, le pilotage de l\'activité et les analyses produit. Vous garantissez la qualité des données, documentez les flux et accompagnez les analystes dans l\'accès à l\'information fiable et à jour.' },
  { id: 'demo2-job-4', recruiter: 'gozem_talent', company: 'Gozem', title: 'Développeur·se Backend Node.js (Nigeria)', country: 'NG', mode: JobMode.REMOTE, type: JobType.CONTRACT,
    currency: 'USD', min: 2500, max: 3500, stack: ['Node.js', 'NestJS', 'PostgreSQL'], publishedDaysAgo: 44,
    description: 'Mission de neuf mois pour renforcer l\'équipe qui développe les services de paiement et de facturation. Vous livrez des API testées, relisez le code de vos pairs et participez aux astreintes partagées. Bonne connaissance de NestJS et de PostgreSQL exigée, expérience des paiements appréciée.' },
  { id: 'demo2-job-5', recruiter: 'wave_recruiter', company: 'Wave Mobile Money', title: 'Product Designer', country: 'GH', mode: JobMode.HYBRID, type: JobType.FULL_TIME,
    currency: 'USD', min: 1800, max: 2800, stack: ['Figma', 'Design system'], publishedDaysAgo: 47,
    description: 'Vous concevez des parcours simples pour des utilisateurs de tous niveaux, y compris peu à l\'aise avec le numérique. Vous menez des tests sur le terrain, maintenez le design system et travaillez main dans la main avec les ingénieurs pour livrer des interfaces accessibles et rapides.' },
  { id: 'demo2-job-6', recruiter: 'gozem_talent', company: 'Gozem', title: 'Stagiaire Développeur·se Web', country: 'CM', mode: JobMode.ONSITE, type: JobType.INTERNSHIP,
    currency: 'XAF', min: 100_000, max: 150_000, stack: ['Angular', 'TypeScript'], publishedDaysAgo: 50,
    description: 'Stage de six mois à Douala au sein de l\'équipe web : vous corrigez des anomalies, développez de petites fonctionnalités et apprenez les bonnes pratiques de test et de revue de code, encadré·e par un développeur senior. Étudiant·e en informatique, motivé·e et curieux·se.' },
];

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_CONFIRM !== 'yes') {
    throw new Error('Refus de peupler une base de production : ajoutez SEED_DEMO_CONFIRM=yes si c\'est voulu.');
  }

  const host = (process.env.DATABASE_URL ?? '').match(/@([^/:?]+)/)?.[1] ?? 'inconnue';
  console.log(`🌱 Contenu de démonstration (sans comptes) → base ${host}\n`);

  const users = await prisma.user.findMany({ where: { username: { in: [...MEMBERS, ...RECRUITERS] } }, select: { id: true, username: true } });
  const ids = new Map(users.map((user) => [user.username, user.id]));
  const missing = [...MEMBERS, ...RECRUITERS].filter((username) => !ids.has(username));
  if (missing.length) {
    throw new Error(`Comptes de démonstration introuvables : ${missing.join(', ')}. Lancez d'abord prisma:seed:demo.`);
  }

  let answerCount = 0;
  for (const post of POSTS) {
    const createdAt = daysAgo(post.ageDays);
    const data = { title: post.title, body: post.body, userId: ids.get(post.author)!, isResolved: post.resolved, voteScore: post.voteScore, viewCount: post.views, createdAt, lastActivityAt: createdAt };
    await prisma.post.upsert({ where: { id: post.id }, update: data, create: { id: post.id, ...data } });
    await prisma.postTag.deleteMany({ where: { postId: post.id } });
    for (const slug of post.tags) {
      const { id: tagId } = await prisma.tag.upsert({ where: { slug }, update: {}, create: { slug, name: slug } });
      await prisma.postTag.create({ data: { postId: post.id, tagId } });
    }
    for (const [index, answer] of post.answers.entries()) {
      if (answer.author === post.author) throw new Error(`${post.id} : l'auteur d'une question ne répond pas à la sienne.`);
      const answerId = `${post.id}-answer-${index + 1}`;
      const answerData = { body: answer.body, postId: post.id, userId: ids.get(answer.author)!, isAccepted: !!answer.accepted, voteScore: answer.voteScore, createdAt: daysAgo(answer.ageDays) };
      await prisma.answer.upsert({ where: { id: answerId }, update: answerData, create: { id: answerId, ...answerData } });
      answerCount++;
    }
  }
  console.log(`  ✓ ${POSTS.length} questions, ${answerCount} réponses (dont une question à ${CACHE_TIPS.length} réponses pour la pagination)`);

  for (const project of PROJECTS) {
    const category = await prisma.projectCategory.findUnique({ where: { slug: project.category } });
    const data = {
      name: project.name, description: project.description, country: project.country, repoUrl: project.repoUrl, demoUrl: project.demoUrl,
      userId: ids.get(project.author)!, categoryId: category?.id ?? null,
      githubFullName: project.repoUrl.replace('https://github.com/', ''), githubStars: project.stars, githubForks: project.forks,
      githubLanguage: project.language, githubLastPush: daysAgo(5), githubSyncedAt: new Date(),
    };
    const saved = await prisma.project.upsert({ where: { slug: project.slug }, update: data, create: { slug: project.slug, ...data } });
    await prisma.projectTag.deleteMany({ where: { projectId: saved.id } });
    for (const slug of project.tags) {
      const { id: tagId } = await prisma.tag.upsert({ where: { slug }, update: {}, create: { slug, name: slug } });
      await prisma.projectTag.create({ data: { projectId: saved.id, tagId } });
    }
  }
  console.log(`  ✓ ${PROJECTS.length} projets`);

  for (const job of JOBS) {
    const publishedAt = daysAgo(job.publishedDaysAgo);
    const data = {
      title: job.title, description: job.description, company: job.company, recruiterId: ids.get(job.recruiter)!,
      country: job.country, mode: job.mode, type: job.type, currency: job.currency, salaryMin: job.min, salaryMax: job.max,
      salaryMinUsd: toUsd(job.min, job.currency), salaryMaxUsd: toUsd(job.max, job.currency),
      stack: job.stack.map((item) => item.toLowerCase()), status: 'ACTIVE' as const,
      createdAt: publishedAt, publishedAt, expiresAt: new Date(publishedAt.getTime() + 75 * DAY),
    };
    await prisma.jobOffer.upsert({ where: { id: job.id }, update: data, create: { id: job.id, ...data } });
  }
  console.log(`  ✓ ${JOBS.length} offres`);

  console.log('\n✅ Contenu de démonstration prêt (aucun compte créé ni modifié).');
}

main()
  .catch((error) => {
    console.error('❌ Seed du contenu de démonstration échoué:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
