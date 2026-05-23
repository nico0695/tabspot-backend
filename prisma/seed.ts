import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

import { getFixtures } from './seeds/fixtures';
import { seedArtists } from './seeds/artists.seed';
import { seedGenres } from './seeds/genres.seed';
import { seedSongs } from './seeds/songs.seed';
import { seedTabs } from './seeds/tabs.seed';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

async function clearSeededCatalog(): Promise<void> {
  await prisma.tabRating.deleteMany();
  await prisma.tab.deleteMany();
  await prisma.songGenre.deleteMany();
  await prisma.song.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.genre.deleteMany();
}

async function main(): Promise<void> {
  const fixtures = getFixtures();

  await clearSeededCatalog();

  const genres = await seedGenres(prisma, fixtures);
  const artists = await seedArtists(prisma, fixtures);
  const songs = await seedSongs(prisma, fixtures);
  const tabs = await seedTabs(prisma, fixtures);

  console.log(
    `Seeded: ${genres.count} genres, ` +
      `${artists.count} artists, ${songs.count} songs, ` +
      `${songs.songGenreCount} song-genre links, ${tabs.count} tabs.`,
  );
}

async function bootstrap(): Promise<void> {
  try {
    await main();
  } catch (error: unknown) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void bootstrap();
