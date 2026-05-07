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
import { PrismaService } from '@src/prisma/prisma.service';
import { UserRepository } from '../user.repository';

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

const testDatabaseUrl = process.env['DATABASE_URL_TEST'];
if (testDatabaseUrl === undefined || testDatabaseUrl === '') {
  throw new Error('DATABASE_URL_TEST must be set for integration tests');
}
process.env['DATABASE_URL'] = testDatabaseUrl;

describe('UserRepository (integration)', () => {
  let prisma: PrismaService;
  let repository: UserRepository;

  beforeAll(async (): Promise<void> => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new UserRepository(prisma);
  });

  afterEach(async (): Promise<void> => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
  });

  afterAll(async (): Promise<void> => {
    await prisma.$disconnect();
  });

  it('findBySupabaseAuthId returns null when no row exists', async (): Promise<void> => {
    const result = await repository.findBySupabaseAuthId('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });

  it('findBySupabaseAuthId returns the User when a matching row exists', async (): Promise<void> => {
    const supabaseAuthId = '11111111-1111-1111-1111-111111111111';
    await prisma.user.create({
      data: { supabaseAuthId, email: 'seeded@example.com', displayName: 'Seeded' },
    });

    const result = await repository.findBySupabaseAuthId(supabaseAuthId);

    expect(result).not.toBeNull();
    expect(result?.email).toBe('seeded@example.com');
    expect(result?.displayName).toBe('Seeded');
    expect(result?.role).toBe('USER');
    expect(result?.status).toBe('ACTIVE');
  });

  it('create inserts a row with role=USER, status=ACTIVE, generated id and timestamps', async (): Promise<void> => {
    const supabaseAuthId = '22222222-2222-2222-2222-222222222222';

    const created = await repository.create({
      supabaseAuthId,
      email: 'new@example.com',
      displayName: 'New User',
    });

    expect(created.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(created.supabaseAuthId).toBe(supabaseAuthId);
    expect(created.email).toBe('new@example.com');
    expect(created.displayName).toBe('New User');
    expect(created.role).toBe('USER');
    expect(created.status).toBe('ACTIVE');
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  it('create persists displayName as null when input is null', async (): Promise<void> => {
    const created = await repository.create({
      supabaseAuthId: '33333333-3333-3333-3333-333333333333',
      email: 'noname@example.com',
      displayName: null,
    });

    expect(created.displayName).toBeNull();
  });

  it('create with duplicate supabaseAuthId rejects with Prisma P2002 unique violation', async (): Promise<void> => {
    const supabaseAuthId = '44444444-4444-4444-4444-444444444444';
    await repository.create({
      supabaseAuthId,
      email: 'first@example.com',
      displayName: null,
    });

    await expect(
      repository.create({
        supabaseAuthId,
        email: 'second@example.com',
        displayName: null,
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });
});
