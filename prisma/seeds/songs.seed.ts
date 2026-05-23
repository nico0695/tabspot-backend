import type { PrismaClient } from '../../src/generated/prisma/client';

import type { ChordProFixture } from './fixtures';
import { getArtistSeedData } from './seed-data';

export interface SongsSeedResult {
  count: number;
  songGenreCount: number;
  slugs: string[];
}

export async function seedSongs(
  prisma: PrismaClient,
  fixtures: readonly ChordProFixture[],
): Promise<SongsSeedResult> {
  let songGenreCount = 0;

  for (const entry of fixtures) {
    const artistData = getArtistSeedData(entry.artistSlug);
    const artist = await prisma.artist.findUniqueOrThrow({ where: { slug: artistData.slug } });
    const song = await prisma.song.upsert({
      where: { artistId_slug: { artistId: artist.id, slug: entry.songSlug } },
      update: {
        title: entry.songTitle,
        subtitle: null,
        releaseYear: null,
        deletedAt: null,
      },
      create: {
        artistId: artist.id,
        title: entry.songTitle,
        slug: entry.songSlug,
        subtitle: null,
        releaseYear: null,
      },
    });

    await prisma.songGenre.deleteMany({ where: { songId: song.id } });

    for (const genreSlug of artistData.genreSlugs) {
      const genre = await prisma.genre.findUniqueOrThrow({ where: { slug: genreSlug } });

      await prisma.songGenre.create({
        data: { songId: song.id, genreId: genre.id },
      });
      songGenreCount++;
    }
  }

  return {
    count: fixtures.length,
    songGenreCount,
    slugs: fixtures.map((entry) => `${entry.artistSlug}/${entry.songSlug}`),
  };
}
