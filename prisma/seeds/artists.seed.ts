import type { PrismaClient } from '../../src/generated/prisma/client';

import type { ChordProFixture } from './fixtures';
import { getArtistSeedData } from './seed-data';

export interface ArtistsSeedResult {
  count: number;
  slugs: string[];
}

export async function seedArtists(
  prisma: PrismaClient,
  fixtures: readonly ChordProFixture[],
): Promise<ArtistsSeedResult> {
  const artists = Array.from(new Set(fixtures.map((fixture) => fixture.artistSlug)))
    .sort((left, right) => left.localeCompare(right))
    .map(getArtistSeedData);

  for (const artist of artists) {
    await prisma.artist.upsert({
      where: { slug: artist.slug },
      update: { name: artist.name, sortName: null, deletedAt: null },
      create: { name: artist.name, slug: artist.slug, sortName: null },
    });
  }

  return { count: artists.length, slugs: artists.map((artist) => artist.slug) };
}
