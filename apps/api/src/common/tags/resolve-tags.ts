import { Prisma } from '@prisma/client';

// Slug de tag : minuscules, séparateurs réduits à « - » (ex. « Nest JS » → « nest-js »).
export function toTagSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Renvoie les identifiants des tags, en créant les manquants.
// Trois requêtes groupées quel que soit le nombre de tags (au lieu d'un upsert par tag).
// À appeler dans une transaction interactive.
export async function resolveTagIds(
  tx: Prisma.TransactionClient,
  names: string[],
): Promise<string[]> {
  const bySlug = new Map<string, string>();
  for (const name of names) {
    const slug = toTagSlug(name);
    if (slug && !bySlug.has(slug)) bySlug.set(slug, name);
  }
  const slugs = [...bySlug.keys()];

  await tx.tag.createMany({
    data: [...bySlug].map(([slug, name]) => ({ name, slug, usageCount: 0 })),
    skipDuplicates: true,
  });

  const tags = await tx.tag.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  });

  await tx.tag.updateMany({
    where: { id: { in: tags.map((t) => t.id) } },
    data: { usageCount: { increment: 1 } },
  });

  return tags.map((t) => t.id);
}
