import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { E2E_PASSWORD, E2E_PREFIX, USERS, emailOf, UserKey } from './env';

let prisma: PrismaClient | null = null;

function client(): PrismaClient {
  if (!process.env['DATABASE_URL']) {
    throw new Error('DATABASE_URL manquante : la suite crée ses comptes de test directement en base (voir apps/web-e2e/README.md).');
  }
  prisma ??= new PrismaClient();
  return prisma;
}

/** Vrai quand les 6 comptes e2e_* existent déjà en base (réutilisation d'une exécution précédente). */
export async function usersExist(): Promise<boolean> {
  const count = await client().user.count({ where: { username: { in: Object.values(USERS).map((user) => user.username) } } });
  return count === Object.keys(USERS).length;
}

/** Crée (ou remet à neuf) les comptes e2e_* : vérifiés, avec assez de réputation pour voter. */
export async function createUsers(): Promise<void> {
  const db = client();
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);

  for (const key of Object.keys(USERS) as UserKey[]) {
    const user = USERS[key];
    const data = {
      email: emailOf(key),
      passwordHash,
      displayName: `E2E ${key}`,
      role: user.role,
      reputation: user.reputation,
      isVerified: true,
      country: 'SN',
      isRecruiter: !!user.recruiter,
      companyName: user.recruiter ? 'E2E Corp' : null,
    };
    await db.user.upsert({ where: { username: user.username }, update: data, create: { username: user.username, ...data } });
  }
}

/**
 * Supprime tout ce que la suite a créé : les comptes e2e_* (leurs questions, réponses, votes, signalements,
 * offres, candidatures, alertes et notifications partent avec eux) et les lignes de modération et d'audit qui
 * les référencent sans suppression en cascade. Les comptes de démonstration ne sont jamais touchés.
 */
export async function cleanup(): Promise<{ users: number }> {
  const db = client();
  const users = await db.user.findMany({ where: { username: { startsWith: E2E_PREFIX } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return { users: 0 };

  const [posts, answers, jobs, projects] = await Promise.all([
    db.post.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    db.answer.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    db.jobOffer.findMany({ where: { recruiterId: { in: userIds } }, select: { id: true } }),
    db.project.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
  ]);
  const contentIds = [...posts, ...answers, ...jobs, ...projects].map((row) => row.id);

  await db.moderationAction.deleteMany({
    where: { OR: [{ moderatorId: { in: userIds } }, { entityId: { in: [...userIds, ...contentIds] } }] },
  });
  await db.auditLog.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { entityId: { in: [...userIds, ...contentIds] } }] } });
  // Les signalements faits par des comptes de démonstration sur du contenu e2e n'existent pas, mais on les retire au cas où.
  await db.report.deleteMany({ where: { entityId: { in: contentIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });

  return { users: userIds.length };
}

/**
 * Remet les comptes e2e_* à neuf sans les recréer : supprime leurs questions, réponses, votes, offres, candidatures,
 * alertes et notifications, rétablit leur réputation et lève les bannissements. Sert au mode `E2E_REUSE=1`, où le
 * quota de 3 offres par mois du plan gratuit serait sinon vite atteint.
 */
export async function resetContent(): Promise<void> {
  const db = client();
  const users = await db.user.findMany({ where: { username: { startsWith: E2E_PREFIX } }, select: { id: true, username: true } });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return;

  const [posts, answers, jobs] = await Promise.all([
    db.post.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    db.answer.findMany({ where: { userId: { in: userIds } }, select: { id: true } }),
    db.jobOffer.findMany({ where: { recruiterId: { in: userIds } }, select: { id: true } }),
  ]);
  const contentIds = [...posts, ...answers, ...jobs].map((row) => row.id);

  await db.moderationAction.deleteMany({ where: { OR: [{ moderatorId: { in: userIds } }, { entityId: { in: [...userIds, ...contentIds] } }] } });
  await db.auditLog.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { entityId: { in: [...userIds, ...contentIds] } }] } });
  await db.report.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { entityId: { in: contentIds } }] } });
  await db.vote.deleteMany({ where: { userId: { in: userIds } } });
  await db.post.deleteMany({ where: { userId: { in: userIds } } });
  await db.jobOffer.deleteMany({ where: { recruiterId: { in: userIds } } });
  await db.jobApplication.deleteMany({ where: { userId: { in: userIds } } });
  await db.jobAlert.deleteMany({ where: { userId: { in: userIds } } });
  await db.notification.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { actorId: { in: userIds } }] } });
  await db.reputationEvent.deleteMany({ where: { userId: { in: userIds } } });

  for (const key of Object.keys(USERS) as UserKey[]) {
    await db.user.updateMany({ where: { username: USERS[key].username }, data: { reputation: USERS[key].reputation } });
  }
}

export async function disconnect(): Promise<void> {
  await prisma?.$disconnect();
  prisma = null;
}
