/**
 * Prisma seed — initial reference data for AfriDev Hub
 * Run: npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Badges ────────────────────────────────────────────────────────────────────

const BADGES = [
  // Reputation milestones (sync with gamification.service.ts checkBadgeMilestones)
  { slug: 'newcomer',    name: 'Newcomer',    description: 'Premiers pas sur AfriDev Hub', icon: '🌱', category: 'REPUTATION' },
  { slug: 'contributor', name: 'Contributor', description: 'Membre actif de la communauté', icon: '⚡', category: 'REPUTATION' },
  { slug: 'established', name: 'Established', description: 'Membre reconnu',                icon: '🏅', category: 'REPUTATION' },
  { slug: 'trusted',     name: 'Trusted',     description: 'Membre de confiance',           icon: '🔷', category: 'REPUTATION' },
  { slug: 'expert',      name: 'Expert',      description: 'Expert de la communauté',       icon: '⭐', category: 'REPUTATION' },
  { slug: 'master',      name: 'Master',      description: 'Maître de la plateforme',       icon: '💎', category: 'REPUTATION' },
  { slug: 'guru',        name: 'Guru',        description: 'Légende AfriDev',               icon: '🔱', category: 'REPUTATION' },

  // Activity badges
  { slug: 'first-answer',      name: 'First Answer',      description: 'A répondu pour la 1ère fois',         icon: '💬', category: 'ACTIVITY' },
  { slug: 'accepted-answer',   name: 'Accepted Answer',   description: 'Sa réponse a été acceptée',           icon: '✅', category: 'ACTIVITY' },
  { slug: 'great-answer',      name: 'Great Answer',      description: 'Réponse avec 10+ votes',              icon: '🎯', category: 'ACTIVITY' },
  { slug: 'first-project',     name: 'Open Source',       description: 'Premier projet soumis',               icon: '🚀', category: 'ACTIVITY' },
  { slug: 'popular-project',   name: 'Popular Project',   description: 'Projet avec 50+ étoiles',             icon: '🌟', category: 'ACTIVITY' },
  { slug: 'recruiter',         name: 'Recruiter',         description: 'Première offre d\'emploi publiée',    icon: '💼', category: 'ACTIVITY' },

  // Special badges
  { slug: 'early-adopter', name: 'Early Adopter', description: 'Parmi les 100 premiers inscrits',    icon: '🦅', category: 'SPECIAL' },
  { slug: 'beta-tester',   name: 'Beta Tester',   description: 'A participé à la bêta',              icon: '🧪', category: 'SPECIAL' },
] as const;

// ── Project categories ─────────────────────────────────────────────────────────

const PROJECT_CATEGORIES = [
  { slug: 'web-app',      name: 'Web App',        description: 'Applications web et SaaS' },
  { slug: 'mobile-app',   name: 'Mobile App',     description: 'Applications iOS / Android' },
  { slug: 'api-backend',  name: 'API / Backend',  description: 'APIs, microservices et backends' },
  { slug: 'devtools',     name: 'Dev Tools',      description: 'Outils pour développeurs' },
  { slug: 'ai-ml',        name: 'IA / ML',        description: 'Intelligence artificielle et machine learning' },
  { slug: 'fintech',      name: 'Fintech',        description: 'Finance, paiements, cryptomonnaie' },
  { slug: 'edtech',       name: 'Edtech',         description: 'Éducation et apprentissage en ligne' },
  { slug: 'healthtech',   name: 'Healthtech',     description: 'Santé et bien-être' },
  { slug: 'agritech',     name: 'Agritech',       description: 'Agriculture et alimentation' },
  { slug: 'ecommerce',    name: 'E-commerce',     description: 'Commerce et marketplace' },
  { slug: 'open-source',  name: 'Open Source',    description: 'Bibliothèques et frameworks open source' },
  { slug: 'cli-tools',    name: 'CLI / Scripts',  description: 'Outils en ligne de commande et scripts' },
  { slug: 'game',         name: 'Jeux',           description: 'Jeux vidéo et applications interactives' },
  { slug: 'other',        name: 'Autre',          description: 'Autres types de projets' },
] as const;

// ── Forum tags (popular seed) ─────────────────────────────────────────────────

const FORUM_TAGS = [
  // Languages & runtimes
  'javascript', 'typescript', 'python', 'java', 'php', 'golang', 'rust', 'c', 'cpp',
  'kotlin', 'swift', 'ruby', 'elixir', 'dart',
  // Frontend
  'angular', 'react', 'vue', 'svelte', 'nextjs', 'nuxtjs', 'tailwindcss',
  'html', 'css', 'sass',
  // Backend
  'nodejs', 'nestjs', 'express', 'fastify', 'django', 'fastapi', 'laravel',
  'spring-boot', 'rails',
  // Mobile
  'flutter', 'react-native', 'ionic', 'android', 'ios',
  // Databases
  'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite', 'prisma', 'typeorm',
  // Cloud & DevOps
  'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'nginx', 'github-actions', 'ci-cd',
  // African payments
  'wave', 'orange-money', 'mtn-momo', 'stripe', 'paiements-afrique',
  // Topics
  'api', 'rest', 'graphql', 'websocket', 'auth', 'jwt', 'oauth',
  'performance', 'securite', 'tests', 'algorithms', 'design-patterns',
  'ia', 'machine-learning', 'nlp',
  // Général
  'debutant', 'aide', 'code-review', 'architecture', 'freelance', 'carriere',
].map(name => ({ name, slug: name }));

// ── Main seed ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding AfriDev Hub database…\n');

  // Badges
  console.log('  → Badges');
  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where:  { slug: badge.slug },
      update: { name: badge.name, description: badge.description, icon: badge.icon },
      create: { ...badge },
    });
  }
  console.log(`     ✓ ${BADGES.length} badges`);

  // Project categories
  console.log('  → Project categories');
  for (const cat of PROJECT_CATEGORIES) {
    await prisma.projectCategory.upsert({
      where:  { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: { ...cat },
    });
  }
  console.log(`     ✓ ${PROJECT_CATEGORIES.length} categories`);

  // Forum tags
  console.log('  → Forum tags');
  for (const tag of FORUM_TAGS) {
    await prisma.tag.upsert({
      where:  { slug: tag.slug },
      update: { name: tag.name },
      create: { ...tag },
    });
  }
  console.log(`     ✓ ${FORUM_TAGS.length} tags`);

  console.log('\n✅ Seed terminé avec succès!');
}

main()
  .catch(err => {
    console.error('❌ Seed échoué:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
