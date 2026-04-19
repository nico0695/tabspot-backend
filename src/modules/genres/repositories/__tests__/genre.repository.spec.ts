// Redirect the generated Prisma client source (which uses import.meta.url and is incompatible
// with ts-jest CJS mode) to the pre-compiled CJS dist output for all modules in this test.

jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../../dist/generated/prisma/client');
});

// Prisma v7's compiled client uses ESM-only .mjs WASM modules at runtime.
// Redirect all .mjs WASM imports to their CJS .js equivalents so Jest (CJS mode) can load them.
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
import { GenreRepository } from '../genre.repository';

// Load .env for local dev if DATABASE_URL_TEST is not already set via the environment.
// In CI, DATABASE_URL_TEST is expected to be set as an env var directly.
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

type PrismaGenreDelegate = {
  create: (args: unknown) => Promise<unknown>;
};

async function seedGenres(prisma: PrismaService, count: number): Promise<void> {
  const delegate = (prisma as unknown as Record<string, PrismaGenreDelegate>)['genre'];
  for (let i = 1; i <= count; i++) {
    await delegate.create({
      data: { name: `Genre ${i}`, slug: `genre-${i}` },
    });
  }
}

describe('GenreRepository (integration)', () => {
  let prisma: PrismaService;
  let repository: GenreRepository;

  beforeAll(async (): Promise<void> => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new GenreRepository(prisma);
  });

  afterEach(async (): Promise<void> => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "genres" RESTART IDENTITY CASCADE');
  });

  afterAll(async (): Promise<void> => {
    await prisma.$disconnect();
  });

  it('returns all genres when count is less than or equal to limit', async (): Promise<void> => {
    await seedGenres(prisma, 3);

    const result = await repository.listCursor({ limit: 10 });

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('returns first page with hasMore: true when count exceeds limit', async (): Promise<void> => {
    await seedGenres(prisma, 5);

    const result = await repository.listCursor({ limit: 3 });

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it('returns the next page correctly using cursor from page 1', async (): Promise<void> => {
    await seedGenres(prisma, 5);

    const page1 = await repository.listCursor({ limit: 3 });
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await repository.listCursor({ limit: 3, cursor: page1.nextCursor as string });

    expect(page2.items).toHaveLength(2);
    expect(page2.hasMore).toBe(false);
    expect(page2.nextCursor).toBeNull();

    // Ensure pages don't overlap
    const page1Ids = page1.items.map((g) => g.id);
    const page2Ids = page2.items.map((g) => g.id);
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it('excludes soft-deleted genres', async (): Promise<void> => {
    await seedGenres(prisma, 3);

    // Soft-delete first genre via raw SQL to bypass the soft-delete extension's delete rewrite
    await prisma.$executeRaw`UPDATE "genres" SET "deleted_at" = NOW() WHERE "slug" = 'genre-1'`;

    const result = await repository.listCursor({ limit: 10 });

    expect(result.items).toHaveLength(2);
    const slugs = result.items.map((g) => g.slug);
    expect(slugs).not.toContain('genre-1');
  });

  it('throws BadRequestException with code INVALID_CURSOR on malformed cursor', async (): Promise<void> => {
    await expect(
      repository.listCursor({ limit: 10, cursor: 'not-valid-base64url!!!' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      repository.listCursor({ limit: 10, cursor: 'not-valid-base64url!!!' }),
    ).rejects.toMatchObject({ response: { code: 'INVALID_CURSOR' } });
  });
});
