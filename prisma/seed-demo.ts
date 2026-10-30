/**
 * Données de démonstration : membres, questions et réponses, projets, offres d'emploi.
 * À lancer APRÈS le seed de référence (pays, tags, catégories, badges) : npm run prisma:seed:demo
 *
 * Idempotent : chaque ligne a un identifiant ou une clé unique fixe, un second passage met à jour.
 * Refuse de tourner en production sans SEED_DEMO_CONFIRM=yes.
 * Mot de passe de tous les comptes : DEMO_PASSWORD (défaut « Demo#2026 »).
 */
import { PrismaClient, JobMode, JobType, UserRole, ExperienceLevel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
const inDays = (days: number) => new Date(Date.now() + days * DAY);

// Taux approximatifs vers l'USD, pour peupler salaryMinUsd / salaryMaxUsd (recalculés chaque jour par l'API).
const USD_PER_UNIT: Record<string, number> = { XOF: 1 / 600, XAF: 1 / 600, NGN: 1 / 1500, GHS: 1 / 15, KES: 1 / 130, EUR: 1.08, USD: 1 };
const toUsd = (amount: number, currency: string) => Math.round(amount * (USD_PER_UNIT[currency] ?? 0));

const USERS = [
  { username: 'admin_afridev', email: 'admin@demo.afridev.hub', displayName: 'Awa Admin', role: UserRole.ADMIN, country: 'SN', level: ExperienceLevel.SENIOR, stack: ['TypeScript', 'NestJS'], reputation: 1200, isVerified: true,
    bio: 'Je coordonne la plateforme AfriDev Hub et la modération. Passionnée de backend, de paiements mobiles et de communautés techniques africaines.', githubUsername: 'afridev-admin' },
  { username: 'modo_koffi', email: 'modo@demo.afridev.hub', displayName: 'Koffi Moderateur', role: UserRole.MODERATOR, country: 'CI', level: ExperienceLevel.SENIOR, stack: ['Angular', 'Node.js'], reputation: 640, isVerified: true,
    bio: 'Modérateur bénévole depuis deux ans, je relis les offres et les signalements. Développeur full-stack à Abidjan, mentor à mes heures perdues.', githubUsername: 'koffi-dev' },
  { username: 'aminata_dev', email: 'aminata@demo.afridev.hub', displayName: 'Aminata Diallo', role: UserRole.MEMBER, country: 'SN', level: ExperienceLevel.MID, stack: ['Angular', 'TypeScript', 'NestJS'], reputation: 215, isVerified: true,
    bio: 'Développeuse full-stack à Dakar, je construis des interfaces Angular et des API NestJS pour des fintechs. J\'écris sur les paiements Mobile Money.', githubUsername: 'aminata-dev', websiteUrl: 'https://aminata.dev' },
  { username: 'chidi_codes', email: 'chidi@demo.afridev.hub', displayName: 'Chidi Okafor', role: UserRole.MEMBER, country: 'NG', level: ExperienceLevel.SENIOR, stack: ['Go', 'PostgreSQL', 'Kubernetes'], reputation: 480, isVerified: true,
    bio: 'Ingénieur backend à Lagos, spécialisé dans les systèmes de paiement à fort trafic, Go et PostgreSQL. Je contribue à plusieurs projets open source.', githubUsername: 'chidi-codes', linkedinUsername: 'chidi-okafor' },
  { username: 'fatou_ml', email: 'fatou@demo.afridev.hub', displayName: 'Fatou Traoré', role: UserRole.MEMBER, country: 'ML', level: ExperienceLevel.JUNIOR, stack: ['Python', 'FastAPI'], reputation: 35, isVerified: false,
    bio: 'Étudiante en data science à Bamako.', githubUsername: 'fatou-ml' },
  { username: 'wave_recruiter', email: 'recrutement@demo.afridev.hub', displayName: 'Mariam Sow', role: UserRole.MEMBER, country: 'SN', level: ExperienceLevel.MID, stack: ['Recrutement'], reputation: 20, isVerified: false, isRecruiter: true, companyName: 'Wave Mobile Money',
    bio: 'Responsable recrutement tech chez Wave.' },
  { username: 'gozem_talent', email: 'talent@demo.afridev.hub', displayName: 'Kodjo Mensah', role: UserRole.MEMBER, country: 'TG', level: ExperienceLevel.MID, stack: ['Recrutement'], reputation: 12, isVerified: false, isRecruiter: true, companyName: 'Gozem',
    bio: 'Talent acquisition chez Gozem, Lomé.' },
];

const POSTS = [
  { id: 'demo-post-1', author: 'aminata_dev', ageDays: 9, resolved: true, voteScore: 14, views: 212,
    title: 'Comment gérer les webhooks de paiement Mobile Money de façon idempotente ?',
    body: 'J\'intègre un fournisseur Mobile Money dans une API NestJS. Le webhook de confirmation est parfois reçu deux fois. Comment garantir que le paiement n\'est crédité qu\'une seule fois, même en cas de rejeu ?',
    tags: ['nestjs', 'paiements-afrique', 'api'],
    answers: [
      { id: 'demo-answer-1', author: 'chidi_codes', ageDays: 8, accepted: true, voteScore: 11,
        body: 'Stockez l\'identifiant d\'événement du fournisseur dans une table avec une contrainte unique. À la réception, tentez l\'insertion : si elle échoue, le webhook a déjà été traité, répondez 200 sans rien refaire. Faites le crédit et l\'insertion dans la même transaction.' },
      { id: 'demo-answer-2', author: 'modo_koffi', ageDays: 8, accepted: false, voteScore: 3,
        body: 'Pensez aussi à vérifier la signature du webhook avant toute écriture, et à réconcilier régulièrement avec l\'API de statut du fournisseur pour rattraper les webhooks perdus.' },
    ] },
  { id: 'demo-post-2', author: 'fatou_ml', ageDays: 5, resolved: false, voteScore: 4, views: 88,
    title: 'Quelle différence entre async et sync dans les routes FastAPI ?',
    body: 'Je débute avec FastAPI. Dans la documentation, certaines routes sont déclarées avec async def et d\'autres avec def. Quand faut-il choisir l\'un ou l\'autre, et quel impact sur les performances ?',
    tags: ['fastapi', 'python', 'debutant'],
    answers: [
      { id: 'demo-answer-3', author: 'chidi_codes', ageDays: 4, accepted: false, voteScore: 2,
        body: 'Utilisez async def quand vous appelez des bibliothèques asynchrones (httpx, asyncpg). Pour du code bloquant, gardez def : FastAPI l\'exécute dans un pool de threads et la boucle d\'événements reste libre.' },
    ] },
  { id: 'demo-post-3', author: 'chidi_codes', ageDays: 3, resolved: false, voteScore: 7, views: 140,
    title: 'Retour d\'expérience : migrer une base PostgreSQL de 200 Go sans interruption',
    body: 'Nous venons de migrer notre base principale vers une nouvelle instance managée. Je partage la méthode (réplication logique, bascule progressive des lectures) et les pièges rencontrés. Questions bienvenues, et surtout vos propres retours.',
    tags: ['postgresql', 'architecture', 'carriere'], answers: [] },
  { id: 'demo-post-4', author: 'aminata_dev', ageDays: 1, resolved: false, voteScore: 0, views: 31,
    title: 'Angular 18 : signals ou RxJS pour l\'état d\'un formulaire multi-étapes ?',
    body: 'Je refais un formulaire d\'inscription en cinq étapes avec Angular 18. Les signals me semblent plus simples, mais je ne sais pas comment gérer la validation asynchrone. Quelle approche recommandez-vous en production ?',
    tags: ['angular', 'typescript', 'architecture'], answers: [] },
];

const PROJECTS = [
  { slug: 'afripay-sdk', name: 'AfriPay SDK', author: 'chidi_codes', country: 'NG', category: 'fintech', tags: ['nodejs', 'paiements-afrique', 'typescript'], stars: 128, forks: 19, language: 'TypeScript',
    repoUrl: 'https://github.com/demo-afridev/afripay-sdk', demoUrl: 'https://afripay-sdk.example.com',
    description: 'SDK TypeScript unifié pour les paiements Mobile Money en Afrique de l\'Ouest : initiation, webhooks idempotents et réconciliation.' },
  { slug: 'kilimo-app', name: 'Kilimo', author: 'aminata_dev', country: 'SN', category: 'agritech', tags: ['flutter', 'dart'], stars: 56, forks: 7, language: 'Dart',
    repoUrl: 'https://github.com/demo-afridev/kilimo', demoUrl: null,
    description: 'Application mobile hors ligne qui aide les agriculteurs à suivre leurs parcelles, les cours du marché et la météo locale.' },
  { slug: 'lexique-wolof-api', name: 'Lexique Wolof API', author: 'fatou_ml', country: 'ML', category: 'open-source', tags: ['fastapi', 'python', 'nlp'], stars: 23, forks: 3, language: 'Python',
    repoUrl: 'https://github.com/demo-afridev/lexique-wolof-api', demoUrl: 'https://lexique.example.com',
    description: 'API ouverte de dictionnaire et de traduction wolof-français, avec jeu de données collaboratif et modèle de suggestion.' },
];

const JOBS = [
  { id: 'demo-job-1', recruiter: 'wave_recruiter', company: 'Wave Mobile Money', title: 'Développeur·se Full-Stack', country: 'SN', mode: JobMode.HYBRID, type: JobType.FULL_TIME,
    currency: 'XOF', min: 1_200_000, max: 1_800_000, stack: ['React', 'Node.js', 'PostgreSQL'], publishedDaysAgo: 2,
    description: 'Rejoignez l\'équipe produit de Wave pour concevoir et maintenir les services qui font circuler les paiements Mobile Money en Afrique de l\'Ouest. Vous travaillerez sur des API à fort trafic, des interfaces React performantes et l\'intégration avec les opérateurs locaux. 3 ans d\'expérience minimum, français et anglais courants.' },
  { id: 'demo-job-2', recruiter: 'gozem_talent', company: 'Gozem', title: 'Ingénieur·e Backend Go', country: 'TG', mode: JobMode.REMOTE, type: JobType.FULL_TIME,
    currency: 'EUR', min: 2200, max: 3200, stack: ['Go', 'PostgreSQL', 'Kubernetes'], publishedDaysAgo: 4,
    description: 'Gozem recherche un·e ingénieur·e backend pour faire évoluer sa plateforme de transport et de livraison présente dans plusieurs pays africains. Vous concevrez des services Go résilients, optimiserez PostgreSQL et participerez aux astreintes. Expérience des systèmes distribués appréciée.' },
  { id: 'demo-job-3', recruiter: 'wave_recruiter', company: 'Wave Mobile Money', title: 'Développeur·se Angular (Mission freelance)', country: 'SN', mode: JobMode.REMOTE, type: JobType.FREELANCE,
    currency: 'XOF', min: 400_000, max: 650_000, stack: ['Angular', 'TypeScript', 'RxJS'], publishedDaysAgo: 6,
    description: 'Mission de trois mois pour refondre le back-office interne en Angular 18 : tableaux de bord, formulaires complexes et tests automatisés. Vous travaillez en autonomie avec l\'équipe produit, en télétravail depuis n\'importe quel pays de la zone UEMOA.' },
  { id: 'demo-job-4', recruiter: 'gozem_talent', company: 'Gozem', title: 'Stagiaire Data Analyst', country: 'TG', mode: JobMode.ONSITE, type: JobType.INTERNSHIP,
    currency: 'XOF', min: 150_000, max: 200_000, stack: ['Python', 'SQL'], publishedDaysAgo: 8,
    description: 'Stage de six mois à Lomé au sein de l\'équipe data : construction de tableaux de bord, nettoyage de données de courses et premiers modèles de prévision de la demande. Étudiant·e en statistiques, informatique ou mathématiques appliquées.' },
];

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_CONFIRM !== 'yes') {
    throw new Error('Refus de peupler une base de production : ajoutez SEED_DEMO_CONFIRM=yes si c\'est voulu.');
  }

  const host = (process.env.DATABASE_URL ?? '').match(/@([^/:?]+)/)?.[1] ?? 'inconnue';
  console.log(`🌱 Données de démonstration → base ${host}\n`);

  const passwordHash = await bcrypt.hash(process.env.DEMO_PASSWORD ?? 'Demo#2026', 12);
  const ids = new Map<string, string>();

  for (const { username, ...rest } of USERS) {
    const data = { ...rest, passwordHash, lastSeenAt: new Date() };
    const user = await prisma.user.upsert({ where: { username }, update: data, create: { username, ...data } });
    ids.set(username, user.id);
  }
  console.log(`  ✓ ${USERS.length} membres`);

  for (const post of POSTS) {
    const createdAt = daysAgo(post.ageDays);
    const data = { title: post.title, body: post.body, userId: ids.get(post.author)!, isResolved: post.resolved, voteScore: post.voteScore, viewCount: post.views, createdAt, lastActivityAt: createdAt };
    await prisma.post.upsert({ where: { id: post.id }, update: data, create: { id: post.id, ...data } });
    await prisma.postTag.deleteMany({ where: { postId: post.id } });
    for (const slug of post.tags) {
      const { id: tagId } = await prisma.tag.upsert({ where: { slug }, update: {}, create: { slug, name: slug } });
      await prisma.postTag.create({ data: { postId: post.id, tagId } });
    }
    for (const answer of post.answers) {
      const answerData = { body: answer.body, postId: post.id, userId: ids.get(answer.author)!, isAccepted: answer.accepted, voteScore: answer.voteScore, createdAt: daysAgo(answer.ageDays) };
      await prisma.answer.upsert({ where: { id: answer.id }, update: answerData, create: { id: answer.id, ...answerData } });
    }
  }
  console.log(`  ✓ ${POSTS.length} questions, ${POSTS.reduce((n, p) => n + p.answers.length, 0)} réponses`);

  for (const project of PROJECTS) {
    const category = await prisma.projectCategory.findUnique({ where: { slug: project.category } });
    const data = {
      name: project.name, description: project.description, country: project.country, repoUrl: project.repoUrl, demoUrl: project.demoUrl,
      userId: ids.get(project.author)!, categoryId: category?.id ?? null,
      githubFullName: project.repoUrl.replace('https://github.com/', ''), githubStars: project.stars, githubForks: project.forks,
      githubLanguage: project.language, githubLastPush: daysAgo(3), githubSyncedAt: new Date(),
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
      stack: job.stack.map((item) => item.toLowerCase()), status: 'ACTIVE' as const, publishedAt, expiresAt: new Date(publishedAt.getTime() + 60 * DAY),
    };
    await prisma.jobOffer.upsert({ where: { id: job.id }, update: data, create: { id: job.id, ...data } });
  }
  // Une offre en attente de validation, pour tester la modération.
  const pending = { title: 'Développeur·se Flutter', description: 'Application mobile grand public pour les transferts d\'argent entre la diaspora et l\'Afrique de l\'Ouest. Vous travaillez avec les équipes design et backend, publiez sur les deux stores et suivez la qualité en production. Deux ans de Flutter minimum.', company: 'Wave Mobile Money', recruiterId: ids.get('wave_recruiter')!, country: 'SN', mode: JobMode.HYBRID, type: JobType.FULL_TIME, currency: 'XOF', salaryMin: 900_000, salaryMax: 1_400_000, salaryMinUsd: toUsd(900_000, 'XOF'), salaryMaxUsd: toUsd(1_400_000, 'XOF'), stack: ['flutter', 'dart'], status: 'PENDING_REVIEW' as const, expiresAt: inDays(60) };
  await prisma.jobOffer.upsert({ where: { id: 'demo-job-pending' }, update: pending, create: { id: 'demo-job-pending', ...pending } });
  console.log(`  ✓ ${JOBS.length + 1} offres (dont 1 en attente de validation)`);

  console.log('\n✅ Données de démonstration prêtes. Connexion : n\'importe quel e-mail ci-dessus avec DEMO_PASSWORD.');
}

main()
  .catch((error) => {
    console.error('❌ Seed de démonstration échoué:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
