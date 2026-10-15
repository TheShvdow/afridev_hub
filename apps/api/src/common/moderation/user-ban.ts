import { ModerationActionType, ModerationTargetType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Un utilisateur est banni si sa dernière action de modération sur son compte est un BAN.
// Une levée de ban (RESTORED) après le BAN le rétablit. Pas de champ dédié sur User.
export async function isUserBanned(
  prisma: Pick<PrismaService, 'moderationAction'>,
  userId: string,
): Promise<boolean> {
  const last = await prisma.moderationAction.findFirst({
    where:   {
      entityType: ModerationTargetType.USER,
      entityId:   userId,
      action:     { in: [ModerationActionType.BAN, ModerationActionType.RESTORED] },
    },
    orderBy: { createdAt: 'desc' },
    select:  { action: true },
  });
  return last?.action === ModerationActionType.BAN;
}
