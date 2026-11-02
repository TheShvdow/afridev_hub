import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

type Mock = jest.Mock;

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    user: { count: Mock; findMany: Mock; update: Mock; findUnique: Mock };
    post: { count: Mock };
    project: { count: Mock };
    jobOffer: { count: Mock };
    report: { count: Mock };
    commission: { aggregate: Mock };
    payment: { count: Mock };
    auditLog: { findMany: Mock; count: Mock; create: Mock };
    moderationAction: { findMany: Mock };
  };

  beforeEach(async () => {
    prisma = {
      user:       { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), findUnique: jest.fn() },
      post:       { count: jest.fn().mockResolvedValue(0) },
      project:    { count: jest.fn().mockResolvedValue(0) },
      jobOffer:   { count: jest.fn().mockResolvedValue(0) },
      report:     { count: jest.fn().mockResolvedValue(0) },
      commission: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }) },
      payment:    { count: jest.fn().mockResolvedValue(0) },
      auditLog:   { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      moderationAction: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(AdminService);
  });

  describe('getDashboardStats', () => {
    it('groupe les compteurs par domaine et met la commission à 0 sans paiement', async () => {
      prisma.user.count.mockResolvedValueOnce(42).mockResolvedValueOnce(5);
      prisma.post.count.mockResolvedValue(10);
      prisma.project.count.mockResolvedValueOnce(7).mockResolvedValueOnce(2);
      prisma.jobOffer.count.mockResolvedValue(3);
      prisma.report.count.mockResolvedValue(1);

      const stats = await service.getDashboardStats();

      expect(stats).toEqual({
        users:      { total: 42, newThisWeek: 5 },
        content:    { posts: 10, projects: 7, jobs: 3 },
        projects:   { visible: 7, withGithubStats: 2 },
        moderation: { pendingReports: 1 },
        revenue:    { totalCommission: 0, capturedPayments: 0 },
        forum:      expect.any(Object),
        jobs:       expect.any(Object),
      });
    });

    it('compte les offres publiées pour SM-5 sur la date de validation', async () => {
      await service.getDashboardStats();
      expect(prisma.jobOffer.count).toHaveBeenCalledWith({ where: { publishedAt: { not: null } } });
      expect(prisma.jobOffer.count).toHaveBeenCalledWith({ where: { status: 'PENDING_REVIEW' } });
    });

    it('calcule les indicateurs forum SM-2 et SM-7 hors contenus masqués', async () => {
      // Sans argument : total historique des questions, hors indicateurs forum.
      prisma.post.count.mockImplementation((args?: { where: { answers?: { some: { isAccepted?: boolean } } } }) => {
        const answers = args?.where.answers;
        return Promise.resolve(!answers ? 40 : answers.some.isAccepted ? 13 : 30);
      });

      const stats = await service.getDashboardStats();

      expect(stats.forum).toEqual(expect.objectContaining({
        questions: 40, questionsWithAnswer: 30, questionsWithAcceptedAnswer: 13, acceptedAnswerRate: 33,
      }));
      expect(stats.forum.last30Days.acceptedAnswerRate).toBe(33);
      expect(prisma.post.count).toHaveBeenCalledWith({ where: expect.objectContaining({ isHidden: false }) });
    });

    it('compte les projets visibles, ceux aux stats GitHub importées (SM-6) et la commission sur les paiements CAPTURED', async () => {
      await service.getDashboardStats();

      expect(prisma.project.count).toHaveBeenCalledWith({ where: { isHidden: false } });
      expect(prisma.project.count).toHaveBeenCalledWith({ where: { isHidden: false, githubSyncedAt: { not: null } } });
      expect(prisma.commission.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where: { payment: { status: 'CAPTURED' } } }),
      );
    });

    it('renvoie la somme des commissions quand elle existe', async () => {
      prisma.commission.aggregate.mockResolvedValue({ _sum: { amount: 1200 } });
      const stats = await service.getDashboardStats();
      expect(stats.revenue.totalCommission).toBe(1200);
    });
  });

  describe('listUsers', () => {
    it('calcule skip et take à partir de la page et de la taille', async () => {
      prisma.user.count.mockResolvedValue(95);

      const result = await service.listUsers(3, 30);

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 60, take: 30 }));
      expect(result.meta).toEqual({ total: 95, page: 3, limit: 30, totalPages: 4 });
    });

    it('filtre sur le nom d\'utilisateur ou l\'email quand une recherche est donnée', async () => {
      await service.listUsers(1, 30, 'amadou');

      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual([
        { username: { contains: 'amadou', mode: 'insensitive' } },
        { email:    { contains: 'amadou', mode: 'insensitive' } },
      ]);
    });

    it('indique les comptes bannis : le dernier BAN ou RESTORED décide', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }]);
      prisma.moderationAction.findMany.mockResolvedValue([
        { entityId: 'u1', action: 'BAN' },
        { entityId: 'u2', action: 'BAN' },
        { entityId: 'u2', action: 'RESTORED' },
      ]);

      const result = await service.listUsers(1, 30);

      expect(result.data.map((user) => [user.id, user.isBanned])).toEqual([['u1', true], ['u2', false], ['u3', false]]);
      expect(prisma.moderationAction.findMany).toHaveBeenCalledTimes(1);
    });

    it('ne lit pas les actions de modération quand la page est vide', async () => {
      await service.listUsers(1, 30);
      expect(prisma.moderationAction.findMany).not.toHaveBeenCalled();
    });

    it('ne filtre pas quand la recherche est absente', async () => {
      await service.listUsers(1, 30);
      expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({});
    });

    it('ne renvoie jamais le hash du mot de passe', async () => {
      await service.listUsers(1, 30);
      const select = prisma.user.findMany.mock.calls[0][0].select;
      expect(select).not.toHaveProperty('passwordHash');
    });
  });

  describe('updateUserRole', () => {
    it('met à jour le rôle et journalise l\'action avec l\'administrateur qui l\'a faite', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: UserRole.MEMBER });
      prisma.user.update.mockResolvedValue({ id: 'u1', username: 'amadou', role: UserRole.MODERATOR });
      prisma.auditLog.create.mockResolvedValue({});

      const user = await service.updateUserRole('u1', UserRole.MODERATOR, 'admin-1');

      expect(user.role).toBe(UserRole.MODERATOR);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'u1' }, data: { role: UserRole.MODERATOR } }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId:     'admin-1',
          action:     'USER_ROLE_UPDATED',
          entityType: 'USER',
          entityId:   'u1',
          metadata:   { role: UserRole.MODERATOR },
        },
      });
    });

    it('n\'écrit pas de trace si la mise à jour échoue', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: UserRole.MEMBER });
      prisma.user.update.mockRejectedValue(new Error('panne base'));

      await expect(service.updateUserRole('u1', UserRole.ADMIN, 'admin-1')).rejects.toThrow('panne base');
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('répond 404 pour un compte inexistant', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUserRole('missing', UserRole.ADMIN, 'admin-1')).rejects.toMatchObject({ code: 'USERS_USER_NOT_FOUND' });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuse qu\'un administrateur change son propre rôle', async () => {
      await expect(service.updateUserRole('admin-1', UserRole.MEMBER, 'admin-1')).rejects.toMatchObject({ code: 'ADMIN_OWN_ROLE_CHANGE_FORBIDDEN' });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('refuse de rétrograder le dernier administrateur', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: UserRole.ADMIN });
      prisma.user.count.mockResolvedValue(1);

      await expect(service.updateUserRole('admin-2', UserRole.MODERATOR, 'admin-1')).rejects.toMatchObject({ code: 'ADMIN_LAST_ADMIN' });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('autorise de rétrograder un administrateur quand il en reste un autre', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: UserRole.ADMIN });
      prisma.user.count.mockResolvedValue(2);
      prisma.user.update.mockResolvedValue({ id: 'admin-2', username: 'b', role: UserRole.MODERATOR });
      prisma.auditLog.create.mockResolvedValue({});

      const user = await service.updateUserRole('admin-2', UserRole.MODERATOR, 'admin-1');

      expect(user.role).toBe(UserRole.MODERATOR);
    });

    it('autorise de promouvoir un membre sans compter les administrateurs', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: UserRole.MEMBER });
      prisma.user.update.mockResolvedValue({ id: 'u1', username: 'a', role: UserRole.ADMIN });
      prisma.auditLog.create.mockResolvedValue({});

      await service.updateUserRole('u1', UserRole.ADMIN, 'admin-1');

      expect(prisma.user.count).not.toHaveBeenCalled();
    });
  });

  describe('getAuditLog', () => {
    it('renvoie les entrées paginées avec leurs métadonnées', async () => {
      prisma.auditLog.count.mockResolvedValue(51);

      const result = await service.getAuditLog(2, 50);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 50, take: 50 }));
      expect(result.meta).toEqual({ total: 51, page: 2, limit: 50, totalPages: 2 });
    });
  });
});
