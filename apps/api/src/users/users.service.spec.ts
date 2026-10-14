import { UsersService } from './users.service';

describe('UsersService — onboarding (story E2-4)', () => {
  function build(current: Record<string, unknown>) {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(current),
        update: jest.fn().mockResolvedValue({ id: 'u1' }),
      },
    };
    const events = { emit: jest.fn() };
    const config = { get: jest.fn((_k: string, d?: string) => d) };
    return { service: new UsersService(prisma as never, events as never, config as never), prisma, events };
  }

  it('fills empty fields', async () => {
    const { service, prisma } = build({ location: null, country: null, stack: [] });
    await service.completeOnboarding('u1', { location: 'Dakar', country: 'SN', stack: ['TypeScript'] } as never);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { location: 'Dakar', country: 'SN', stack: ['TypeScript'] },
    }));
  });

  it('never overwrites a field that is already filled (skip)', async () => {
    const { service, prisma } = build({ location: 'Saint-Louis', country: 'SN', stack: ['Go'] });
    await service.completeOnboarding('u1', { location: 'Dakar', country: 'CI', stack: ['TypeScript'] } as never);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: {} }));
  });

  it('sets the experience level when it is empty', async () => {
    const { service, prisma } = build({ location: null, country: null, stack: [], level: null });
    await service.completeOnboarding('u1', { level: 'SENIOR' } as never);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { level: 'SENIOR' } }));
  });

  it('keeps an experience level that is already declared', async () => {
    const { service, prisma } = build({ location: null, country: null, stack: [], level: 'JUNIOR' });
    await service.completeOnboarding('u1', { level: 'SENIOR' } as never);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: {} }));
  });

  it('emits users.profile.updated', async () => {
    const { service, events } = build({ location: null, country: null, stack: [] });
    await service.completeOnboarding('u1', { country: 'SN' } as never);
    expect(events.emit).toHaveBeenCalledWith('users.profile.updated', { userId: 'u1' });
  });
});
