import { NotificationsService } from './notifications.service';

describe('NotificationsService — notify (story E2-6)', () => {
  it('stores the notification and pushes it to the user in real time', async () => {
    const created = { id: 'n1', userId: 'u1', type: 'SYSTEM', title: 'Test', message: 'Hello', actor: null };
    const prisma = { notification: { create: jest.fn().mockResolvedValue(created) } };
    const gateway = { sendToUser: jest.fn() };
    const service = new NotificationsService(prisma as never, gateway as never);

    const result = await service.notify('u1', { type: 'SYSTEM', title: 'Test', message: 'Hello' });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', type: 'SYSTEM', message: 'Hello' }) }),
    );
    expect(gateway.sendToUser).toHaveBeenCalledWith('u1', 'notification', created);
    expect(result).toBe(created);
  });
});
