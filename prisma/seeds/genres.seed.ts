import type { PrismaClient } from '../../src/generated/prisma/client';

import type { ChordProFixture } from './fixtures';
import { getArtistSeedData, getGenreSeedData } from './seed-data';

export interface GenresSeedResult {
  count: number;
  slugs: string[];
}

export async function seedGenres(
  prisma: PrismaClient,
  fixtures: readonly ChordProFixture[],
): Promise<GenresSeedResult> {
  const genreSlugs = new Set<string>();

  for (const artistSlug of new Set(fixtures.map((fixture) => fixture.artistSlug))) {
    const artist = getArtistSeedData(artistSlug);

    for (const genreSlug of artist.genreSlugs) {
      genreSlugs.add(genreSlug);
    }
  }

  const genres = Array.from(genreSlugs)
    .sort((left, right) => left.localeCompare(right))
    .map(getGenreSeedData);

  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { name: genre.name, deletedAt: null },
      create: { name: genre.name, slug: genre.slug },
    });
  }

  return { count: genres.length, slugs: genres.map((genre) => genre.slug) };
}
