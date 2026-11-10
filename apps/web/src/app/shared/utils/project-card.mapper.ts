import { ProjectListItem } from '../../core/services/projects.service';
import { Project } from '../components/card-project/card-projet';

const FALLBACK_IMAGES = [
  'assets/images/img_projet_1.png',
  'assets/images/img_projet_2.png',
  'assets/images/img_projet_3.png',
];

export function compactCount(value: number): string {
  if (value < 1000) return String(value);

  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function mapProjectToCard(
  project: ProjectListItem,
  index: number,
  countryNames: ReadonlyMap<string, string>,
): Project {
  return {
    id: project.id,
    slug: project.slug,
    image: FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    stars: compactCount(project.githubStars),
    title: project.name,
    description: project.description,
    tags: project.projectTags.map((link) => link.tag.name),
    city: countryNames.get(project.country) ?? project.country,
    author: project.user.displayName ?? project.user.username,
    href: project.demoUrl ?? project.repoUrl,
    detailHref: `/projets/${project.slug}`
  };
}
