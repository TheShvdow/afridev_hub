import { ProjectsService } from './projects.service';

function build(project: Record<string, unknown> | null) {
  const prisma = {
    project: {
      findUnique: jest.fn().mockResolvedValue(project),
      update: jest.fn().mockResolvedValue({ id: 'p1' }),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
  return { service: new ProjectsService(prisma as never), prisma };
}

const project = { id: 'p1', userId: 'owner' };

describe('ProjectsService — modification et suppression', () => {
  it('lets the author update the country and other fields', async () => {
    const { service, prisma } = build(project);
    await service.update('p1', 'owner', { country: 'CI', description: 'Nouvelle description suffisamment longue pour le test.' } as never);
    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { country: 'CI', description: 'Nouvelle description suffisamment longue pour le test.' },
    });
  });

  it('refuses an update from another member', async () => {
    const { service, prisma } = build(project);
    await expect(service.update('p1', 'intrus', { name: 'x' } as never)).rejects.toMatchObject({ code: 'PROJECTS_FORBIDDEN' });
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it('lets the author delete their project', async () => {
    const { service, prisma } = build(project);
    await service.delete('p1', 'owner', 'MEMBER');
    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('lets a moderator or an admin delete any project', async () => {
    const { service, prisma } = build(project);
    await service.delete('p1', 'intrus', 'ADMIN');
    await service.delete('p1', 'intrus', 'MODERATOR');
    expect(prisma.project.delete).toHaveBeenCalledTimes(2);
  });

  it('refuses a deletion from another member', async () => {
    const { service, prisma } = build(project);
    await expect(service.delete('p1', 'intrus', 'MEMBER')).rejects.toMatchObject({ code: 'PROJECTS_FORBIDDEN' });
    expect(prisma.project.delete).not.toHaveBeenCalled();
  });
});
