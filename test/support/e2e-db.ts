import { UserRole, UserStatus } from '@src/generated/prisma/client';
import { PrismaService } from '@src/prisma/prisma.service';

import { makeArtist } from '../factories/make-artist';
import { makeGenre } from '../factories/make-genre';
import { makeSong } from '../factories/make-song';
import { E2E_ADMIN_AUTH_ID, E2E_USER_AUTH_ID } from './e2e-auth';
import { assertE2eDatabaseUrl } from './e2e-env';

export const E2E_USER_ID = '20000000-0000-4000-8000-000000000001';
export const E2E_ADMIN_ID = '20000000-0000-4000-8000-000000000002';
export const E2E_ARTIST_ID = '20000000-0000-4000-8000-000000000101';
export const E2E_GENRE_ID = '20000000-0000-4000-8000-000000000201';
export const E2E_SONG_ID = '20000000-0000-4000-8000-000000000301';

export interface E2eSeedData {
  userId: string;
  adminId: string;
  artistId: string;
  genreId: string;
  songId: string;
}

export async function resetE2eDatabase(prisma: PrismaService): Promise<void> {
  assertE2eDatabaseUrl();
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "tab_ratings", "tabs", "song_genres", "songs", "genres", "artists", "users" RESTART IDENTITY CASCADE',
  );
}

export async function seedE2eDatabase(prisma: PrismaService): Promise<E2eSeedData> {
  const artist = makeArtist({ id: E2E_ARTIST_ID, slug: 'e2e-artist', name: 'E2E Artist' });
  const genre = makeGenre({ id: E2E_GENRE_ID, slug: 'e2e-rock', name: 'E2E Rock' });
  const song = makeSong({
    id: E2E_SONG_ID,
    artistId: E2E_ARTIST_ID,
    slug: 'e2e-song',
    title: 'E2E Song',
  });

  await prisma.user.createMany({
    data: [
      {
        id: E2E_USER_ID,
        supabaseAuthId: E2E_USER_AUTH_ID,
        email: 'e2e-user@example.com',
        displayName: 'E2E User',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
      {
        id: E2E_ADMIN_ID,
        supabaseAuthId: E2E_ADMIN_AUTH_ID,
        email: 'e2e-admin@example.com',
        displayName: 'E2E Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    ],
  });

  await prisma.artist.create({
    data: {
      id: artist.id,
      name: artist.name,
      slug: artist.slug,
      sortName: artist.sortName,
    },
  });
  await prisma.genre.create({
    data: { id: genre.id, name: genre.name, slug: genre.slug },
  });
  await prisma.song.create({
    data: {
      id: song.id,
      artistId: song.artistId,
      title: song.title,
      slug: song.slug,
      subtitle: song.subtitle,
      releaseYear: song.releaseYear,
    },
  });
  await prisma.songGenre.create({ data: { songId: song.id, genreId: genre.id } });

  return {
    userId: E2E_USER_ID,
    adminId: E2E_ADMIN_ID,
    artistId: E2E_ARTIST_ID,
    genreId: E2E_GENRE_ID,
    songId: E2E_SONG_ID,
  };
}
