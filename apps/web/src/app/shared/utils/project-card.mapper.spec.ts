import { ProjectListItem } from '../../core/services/projects.service';
import { compactCount, mapProjectToCard } from './project-card.mapper';

const project = {
  id: 'p1',
  slug: 'afripay-sdk',
  name: 'AfriPay SDK',
  description: 'SDK de paiement',
  country: 'SN',
  githubStars: 1250,
  demoUrl: null,
  repoUrl: 'https://github.com/demo/afripay',
  projectTags: [{ tag: { name: 'TypeScript' } }],
  user: { displayName: null, username: 'chidi' },
} as unknown as ProjectListItem;

describe('mapProjectToCard', () => {
  it('mène au détail du projet sous /projects (/projets ne sert que la liste)', () => {
    expect(mapProjectToCard(project, 0, new Map()).detailHref).toBe('/projects/afripay-sdk');
  });

  it('remplit la carte : pays en clair, auteur, lien externe, étoiles compactes', () => {
    const card = mapProjectToCard(project, 4, new Map([['SN', 'Sénégal']]));

    expect(card.city).toBe('Sénégal');
    expect(card.author).toBe('chidi');
    expect(card.href).toBe('https://github.com/demo/afripay');
    expect(card.stars).toBe(compactCount(1250));
    expect(card.tags).toEqual(['TypeScript']);
  });
});
