import { PlanType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// FR-34 : plan gratuit = 3 offres par mois calendaire ; premium = illimité et profils complets.
export const FREE_MONTHLY_OFFERS = 3;

export interface RecruiterPlanStatus {
  planType:        PlanType;
  isPremium:       boolean;
  premiumUntil:    Date | null;
  offersThisMonth: number;
  monthlyLimit:    number | null; // null : illimité
}

export function startOfMonthUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getRecruiterPlan(prisma: PrismaService, userId: string, now = new Date()): Promise<RecruiterPlanStatus> {
  const [plan, offersThisMonth] = await Promise.all([
    prisma.recruiterPlan.findUnique({ where: { userId } }),
    // Une offre refusée par la modération ne consomme pas le quota.
    prisma.jobOffer.count({
      where: { recruiterId: userId, createdAt: { gte: startOfMonthUtc(now) }, status: { not: 'REJECTED' } },
    }),
  ]);

  const isPremium =
    plan?.planType === PlanType.PREMIUM && plan.isActive && (!plan.expiresAt || plan.expiresAt > now);

  return {
    planType:        isPremium ? PlanType.PREMIUM : PlanType.FREE,
    isPremium,
    premiumUntil:    isPremium ? plan?.expiresAt ?? null : null,
    offersThisMonth,
    monthlyLimit:    isPremium ? null : FREE_MONTHLY_OFFERS,
  };
}
