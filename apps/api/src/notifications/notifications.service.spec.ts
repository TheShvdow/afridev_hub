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

  it('stores the web link of the target so the list can open it', async () => {
    const prisma = { notification: { create: jest.fn().mockResolvedValue({ id: 'n1' }), }, user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new NotificationsService(prisma as never, { sendToUser: jest.fn() } as never);

    await service.notifyNewAnswer('author', 'a1', 'p1', 'helper');

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ link: '/forum/p1' }) }),
    );
  });
});

describe('NotificationsService — email (FR-18)', () => {
  function build(emailNotifications: boolean) {
    const prisma = {
      notification: { create: jest.fn().mockResolvedValue({ id: 'n1' }) },
      user:         { findUnique: jest.fn().mockResolvedValue({ email: 'dev@afridev.io', emailNotifications }) },
    };
    const mail = { send: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn().mockReturnValue('https://afridevhub.com') };
    const service = new NotificationsService(prisma as never, { sendToUser: jest.fn() } as never, mail as never, config as never);
    return { service, mail };
  }
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it('emails the author of the question with a link to it', async () => {
    const { service, mail } = build(true);
    await service.notifyNewAnswer('author', 'a1', 'p1', 'helper');
    await flush();
    expect(mail.send).toHaveBeenCalledWith(
      'dev@afridev.io', 'Nouvelle réponse à votre question', expect.stringContaining('https://afridevhub.com/forum/p1'),
    );
  });

  it('sends no email when the member turned emails off', async () => {
    const { service, mail } = build(false);
    await service.notifyNewAnswer('author', 'a1', 'p1', 'helper');
    await flush();
    expect(mail.send).not.toHaveBeenCalled();
  });
});

describe('NotificationsService — accusé de réception de candidature', () => {
  const application = {
    id: 'abcdef12-0000-0000-0000-000000000000',
    createdAt: new Date('2026-10-28T09:30:00Z'),
    cvUrl: null as string | null,
    job:  { id: 'job-1', title: 'Développeur Angular', company: 'Wave' },
    user: { email: 'aminata@example.com', username: 'aminata', displayName: 'Aminata' },
  };

  function build(found: typeof application | null, emailNotifications = false) {
    const prisma = {
      jobApplication: { findUnique: jest.fn().mockResolvedValue(found) },
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'aminata@example.com', emailNotifications }) },
    };
    const mail = { send: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn().mockReturnValue('https://afridevhub.com') };
    const service = new NotificationsService(prisma as never, { sendToUser: jest.fn() } as never, mail as never, config as never);
    return { service, mail, prisma };
  }

  it('emails the applicant a receipt with the offer details, even with activity emails turned off', async () => {
    const { service, mail } = build(application, false);

    await service.sendApplicationReceipt(application.id);

    expect(mail.send).toHaveBeenCalledTimes(1);
    const [to, subject, html] = mail.send.mock.calls[0];
    expect(to).toBe('aminata@example.com');
    expect(subject).toBe('Candidature envoyée : Développeur Angular chez Wave');
    expect(html).toContain('Développeur Angular');
    expect(html).toContain('Wave');
    expect(html).toContain('ABCDEF12');
    expect(html).toContain('https://afridevhub.com/jobs/job-1');
  });

  it('says whether a CV was attached', async () => {
    const { service, mail } = build({ ...application, cvUrl: 'cvs/u1/x.pdf' });

    await service.sendApplicationReceipt(application.id);

    expect(mail.send.mock.calls[0][2]).toMatch(/CV joint[\s\S]*Oui/);
  });

  it('sends nothing when the application no longer exists', async () => {
    const { service, mail } = build(null);

    await service.sendApplicationReceipt('missing');

    expect(mail.send).not.toHaveBeenCalled();
  });
});
