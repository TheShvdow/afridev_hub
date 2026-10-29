import { DASHBOARD_ROUTES } from './dashboard.routes';

const children = DASHBOARD_ROUTES[0].children ?? [];
const route = (path: string) => children.find((child) => child.path === path);

describe('dashboard routes', () => {
  it('lets every signed-in member reach the pages of their own account', () => {
    for (const path of ['', 'notifications', 'alertes', 'profil', 'offres', 'plan']) {
      expect(route(path)).toBeDefined();
      expect(route(path)?.canActivate).toBeUndefined();
    }
  });

  it('reserves moderation to moderators and administrators', () => {
    for (const path of ['moderation/signalements', 'moderation/offres']) {
      expect(route(path)?.data).toEqual({ roles: ['MODERATOR', 'ADMIN'] });
      expect(route(path)?.canActivate).toHaveLength(1);
    }
  });

  it('reserves administration to administrators', () => {
    for (const path of ['administration/indicateurs', 'administration/utilisateurs', 'administration/audit']) {
      expect(route(path)?.data).toEqual({ roles: ['ADMIN'] });
      expect(route(path)?.canActivate).toHaveLength(1);
    }
  });

  it('makes the pages show a compact header inside the shell', () => {
    expect(DASHBOARD_ROUTES[0].providers).toHaveLength(1);
  });
});
