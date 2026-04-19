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
import { ArtistRepository } from '../artist.repository';

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
  create: (args: unknown) => Promise<unknown>;
};

async function seedArtists(prisma: PrismaService, count: number): Promise<void> {
  const delegate = (prisma as unknown as Record<string, PrismaArtistDelegate>)['artist'];
  for (let i = 1; i <= count; i++) {
    await delegate.create({
      data: { name: `Artist ${i}`, slug: `artist-${i}`, sortName: `Sort ${i}` },
    });
  }
}

describe('ArtistRepository (integration)', () => {
  let prisma: PrismaService;
  let repository: ArtistRepository;

  beforeAll(async (): Promise<void> => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new ArtistRepository(prisma);
  });

  afterEach(async (): Promise<void> => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "song_genres", "songs", "artists" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async (): Promise<void> => {
    await prisma.$disconnect();
  });

  it('returns all artists when count is less than or equal to limit', async (): Promise<void> => {
    await seedArtists(prisma, 3);

    const result = await repository.listCursor({ limit: 10 });

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('returns first page with hasMore: true when count exceeds limit', async (): Promise<void> => {
    await seedArtists(prisma, 5);

    const result = await repository.listCursor({ limit: 3 });

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it('returns the next page correctly using cursor from page 1', async (): Promise<void> => {
    await seedArtists(prisma, 5);

    const page1 = await repository.listCursor({ limit: 3 });
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await repository.listCursor({ limit: 3, cursor: page1.nextCursor as string });

    expect(page2.items).toHaveLength(2);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();

    // Ensure pages don't overlap
    const page1Ids = page1.items.map((a) => a.id);
    const page2Ids = page2.items.map((a) => a.id);
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('excludes soft-deleted artists', async (): Promise<void> => {
    await seedArtists(prisma, 3);

    // Soft-delete first artist via raw SQL to bypass the soft-delete extension's delete rewrite
    await prisma.$executeRaw`UPDATE "artists" SET "deleted_at" = NOW() WHERE "slug" = 'artist-1'`;

    const result = await repository.listCursor({ limit: 10 });

    expect(result.items).toHaveLength(2);
    const slugs = result.items.map((a) => a.slug);
    expect(slugs).not.toContain('artist-1');
  });

  it('throws BadRequestException with code INVALID_CURSOR on malformed cursor', async (): Promise<void> => {
    await expect(
      repository.listCursor({ limit: 10, cursor: 'not-valid-base64url!!!' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      repository.listCursor({ limit: 10, cursor: 'not-valid-base64url!!!' }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_CURSOR' } });
  });

  it('throws BadRequestException with code INVALID_CURSOR when decoded payload is missing id', async (): Promise<void> => {
    const badCursor = Buffer.from(JSON.stringify({ wrong: 'shape' })).toString('base64url');

    await expect(repository.listCursor({ limit: 10, cursor: badCursor })).rejects.toMatchObject({
      response: { code: 'INVALID_CURSOR' },
    });
  });

  it('applies q filter with case-insensitive contains on name', async (): Promise<void> => {
    const delegate = (prisma as unknown as Record<string, PrismaArtistDelegate>)['artist'];
    await delegate.create({ data: { name: 'The Beatles', slug: 'the-beatles' } });
    await delegate.create({ data: { name: 'Radiohead', slug: 'radiohead' } });
    await delegate.create({ data: { name: 'Metallica', slug: 'metallica' } });

    const result = await repository.listCursor({ limit: 10, q: 'BEA' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('The Beatles');
  });
});
