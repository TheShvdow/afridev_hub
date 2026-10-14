import { ModerationService } from './moderation.service';

describe('ModerationService — cibles des actions', () => {
  it('records a ban against the USER target type', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'm1' });
    const service = new ModerationService({ moderationAction: { create } } as never);
    await service.banUser('target', 'mod', 'Spam répété');
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ entityType: 'USER', entityId: 'target', moderatorId: 'mod' }),
    });
  });

  it('records an unban against the USER target type', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'm2' });
    const service = new ModerationService({ moderationAction: { create } } as never);
    await service.unbanUser('target', 'mod');
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ entityType: 'USER', entityId: 'target' }),
    });
  });
});
