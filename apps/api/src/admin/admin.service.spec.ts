import { Test } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

type Mock = jest.Mock;

describe('AdminService', () => {
  let service: AdminService;
  let prisma: {
    user: { count: Mock; findMany: Mock; update: Mock };
    post: { count: Mock };
    project: { count: Mock };
    jobOffer: { count: Mock };
    report: { count: Mock };
    commission: { aggregate: Mock };
    auditLog: { findMany: Mock; count: Mock; create: Mock };
  };

  beforeEach(async () => {
    prisma = {
      user:       { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      post:       { count: jest.fn().mockResolvedValue(0) },
      project:    { count: jest.fn().mockResolvedValue(0) },
      jobOffer:   { count: jest.fn().mockResolvedValue(0) },
      report:     { count: jest.fn().mockResolvedValue(0) },
      commission: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }) },
      auditLog:   { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), create: jest.fn() },
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
        moderation: { pendingReports: 1, pendingProjects: 2 },
        revenue:    { totalCommission: 0 },
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

    it('calcule les projets en attente sur isApproved = false et la commission sur les paiements CAPTURED', async () => {
      await service.getDashboardStats();

      expect(prisma.project.count).toHaveBeenCalledWith({ where: { isApproved: true } });
      expect(prisma.project.count).toHaveBeenCalledWith({ where: { isApproved: false } });
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
      prisma.user.update.mockRejectedValue(new Error('not found'));

      await expect(service.updateUserRole('missing', UserRole.ADMIN, 'admin-1')).rejects.toThrow('not found');
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
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
