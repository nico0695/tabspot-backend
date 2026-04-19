jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../../dist/generated/prisma/client');
});

jest.mock(
  '@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
    return require('@prisma/client/runtime/query_compiler_fast_bg.postgresql.js');
  },
  { virtual: true },
);
jest.mock(
  '@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
    return require('@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.js');
  },
  { virtual: true },
);

import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '@src/prisma/prisma.service';
import { SongRepository } from '../song.repository';

if (process.env['DATABASE_URL_TEST'] === undefined) {
  const envPath = path.resolve(__dirname, '../../../../../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^#\s=][^=]*)=(.*)$/);
      if (match !== null) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Point to the test database before PrismaService is instantiated.
const testDatabaseUrl = process.env['DATABASE_URL_TEST'];
if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
  throw new Error('DATABASE_URL_TEST must be set for integration tests');
}
process.env['DATABASE_URL'] = testDatabaseUrl;

type PrismaArtistDelegate = {
  create: (args: unknown) => Promise<{ id: string; slug: string }>;
};

type PrismaSongDelegate = {
  create: (args: unknown) => Promise<{ id: string; slug: string; artistId: string }>;
};

interface SeededArtist {
  id: string;
  slug: string;
}

async function createArtist(prisma: PrismaService, slug: string): Promise<SeededArtist> {
  const delegate = (prisma as unknown as Record<string, PrismaArtistDelegate>)['artist'];
  const created = await delegate.create({
    data: { name: slug, slug },
  });
  return { id: created.id, slug: created.slug };
}

async function createSong(
  prisma: PrismaService,
  artistId: string,
  slug: string,
  title: string,
): Promise<void> {
  const delegate = (prisma as unknown as Record<string, PrismaSongDelegate>)['song'];
  await delegate.create({
    data: { artistId, slug, title },
  });
}

describe('SongRepository (integration)', () => {
  let prisma: PrismaService;
  let repository: SongRepository;

  beforeAll(async (): Promise<void> => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new SongRepository(prisma);
  });

  afterEach(async (): Promise<void> => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "song_genres", "songs", "artists" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async (): Promise<void> => {
    await prisma.$disconnect();
  });

  it('returns all songs when count is less than or equal to limit', async (): Promise<void> => {
    const artist = await createArtist(prisma, 'the-beatles');
    await createSong(prisma, artist.id, 'hey-jude', 'Hey Jude');
    await createSong(prisma, artist.id, 'let-it-be', 'Let It Be');
    await createSong(prisma, artist.id, 'yesterday', 'Yesterday');

    const result = await repository.listCursor({ limit: 10 });

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('returns first page with hasMore: true when count exceeds limit', async (): Promise<void> => {
    const artist = await createArtist(prisma, 'the-beatles');
    for (let i = 1; i <= 5; i++) {
      await createSong(prisma, artist.id, `song-${i}`, `Song ${i}`);
    }

    const result = await repository.listCursor({ limit: 3 });

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it('returns the next page correctly using cursor from page 1', async (): Promise<void> => {
    const artist = await createArtist(prisma, 'the-beatles');
    for (let i = 1; i <= 5; i++) {
      await createSong(prisma, artist.id, `song-${i}`, `Song ${i}`);
    }

    const page1 = await repository.listCursor({ limit: 3 });
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await repository.listCursor({ limit: 3, cursor: page1.nextCursor as string });

    expect(page2.items).toHaveLength(2);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();

    // Ensure pages don't overlap
    const page1Ids = page1.items.map((s) => s.id);
    const page2Ids = page2.items.map((s) => s.id);
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('excludes soft-deleted songs', async (): Promise<void> => {
    const artist = await createArtist(prisma, 'the-beatles');
    await createSong(prisma, artist.id, 'hey-jude', 'Hey Jude');
    await createSong(prisma, artist.id, 'let-it-be', 'Let It Be');
    await createSong(prisma, artist.id, 'yesterday', 'Yesterday');

    // Soft-delete via raw SQL to bypass the soft-delete extension's delete rewrite
    await prisma.$executeRaw`UPDATE "songs" SET "deleted_at" = NOW() WHERE "slug" = 'hey-jude'`;

    const result = await repository.listCursor({ limit: 10 });

    expect(result.items).toHaveLength(2);
    const slugs = result.items.map((s) => s.slug);
    expect(slugs).not.toContain('hey-jude');
  });

  it('throws BadRequestException with code INVALID_CURSOR on malformed cursor', async (): Promise<void> => {
    await expect(
      repository.listCursor({ limit: 10, cursor: 'not-valid-base64url!!!' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      repository.listCursor({ limit: 10, cursor: 'not-valid-base64url!!!' }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_CURSOR' } });
  });

  it('applies q filter with case-insensitive contains on title', async (): Promise<void> => {
    const artist = await createArtist(prisma, 'the-beatles');
    await createSong(prisma, artist.id, 'hey-jude', 'Hey Jude');
    await createSong(prisma, artist.id, 'let-it-be', 'Let It Be');
    await createSong(prisma, artist.id, 'yesterday', 'Yesterday');

    const result = await repository.listCursor({ limit: 10, q: 'JUDE' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Hey Jude');
  });

  it('applies artistId filter to narrow results to a single artist', async (): Promise<void> => {
    const beatles = await createArtist(prisma, 'the-beatles');
    const radiohead = await createArtist(prisma, 'radiohead');
    await createSong(prisma, beatles.id, 'hey-jude', 'Hey Jude');
    await createSong(prisma, beatles.id, 'let-it-be', 'Let It Be');
    await createSong(prisma, radiohead.id, 'creep', 'Creep');
    await createSong(prisma, radiohead.id, 'karma-police', 'Karma Police');

    const result = await repository.listCursor({ limit: 10, artistId: beatles.id });

    expect(result.items).toHaveLength(2);
    for (const song of result.items) {
      expect(song.artistId).toBe(beatles.id);
    }
  });

  it('composes q and artistId filters with AND semantics', async (): Promise<void> => {
    const beatles = await createArtist(prisma, 'the-beatles');
    const radiohead = await createArtist(prisma, 'radiohead');
    await createSong(prisma, beatles.id, 'hey-jude', 'Hey Jude');
    await createSong(prisma, beatles.id, 'let-it-be', 'Let It Be');
    // Give Radiohead a song whose title contains "jude" to prove AND narrows it out.
    await createSong(prisma, radiohead.id, 'jude-tribute', 'Jude Tribute');

    const result = await repository.listCursor({ limit: 10, q: 'jude', artistId: beatles.id });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Hey Jude');
    expect(result.items[0].artistId).toBe(beatles.id);
  });
});
