// Redirect the generated Prisma client source (which uses import.meta.url and is incompatible
// with ts-jest CJS mode) to the pre-compiled CJS dist output for all modules in this test.
jest.mock('@src/generated/prisma/client', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require('../../../../dist/generated/prisma/client');
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
import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { AuthGuard } from '@common/guards/auth.guard';
import { AppConfigModule } from '@config/config.module';
import { AuthModule } from '@modules/auth/auth.module';
import type { User, UserRole } from '@src/generated/prisma/client';
import { PrismaModule } from '@src/prisma/prisma.module';
import { PrismaService } from '@src/prisma/prisma.service';

// Load .env for local dev if DATABASE_URL_TEST is not already set via the environment.
// In CI, DATABASE_URL_TEST is expected to be set as an env var directly.
if (process.env['DATABASE_URL_TEST'] === undefined) {
  const envPath = path.resolve(__dirname, '../../../../.env');
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

const TEST_SECRET = 'smoke-test-jwt-secret-long-enough-for-hs256';
const SECRET_KEY = new TextEncoder().encode(TEST_SECRET);

interface WhoamiResponse {
  id: string;
  email: string;
  role: UserRole;
}

@Controller('smoke')
class SmokeWhoamiController {
  @Get('whoami')
  @UseGuards(AuthGuard)
  whoami(@CurrentUser() user: User): WhoamiResponse {
    return { id: user.id, email: user.email, role: user.role };
  }
}

describe('Auth flow (smoke)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  async function signTestJwt(opts: {
    sub: string;
    email: string;
    emailConfirmed?: boolean;
    expSecondsFromNow?: number;
    fullName?: string | null;
  }): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      email: opts.email,
      email_confirmed: opts.emailConfirmed ?? true,
    };
    if (opts.fullName !== undefined) {
      payload['user_metadata'] = { full_name: opts.fullName };
    }
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(opts.sub)
      .setIssuedAt(now)
      .setExpirationTime(now + (opts.expSecondsFromNow ?? 3600))
      .sign(SECRET_KEY);
  }

  beforeAll(async (): Promise<void> => {
    process.env['SUPABASE_JWT_PUBLIC_KEY'] = TEST_SECRET;
    process.env['SUPABASE_URL'] = process.env['SUPABASE_URL'] ?? 'https://test.supabase.co';

    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, PrismaModule, AuthModule],
      controllers: [SmokeWhoamiController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  afterEach(async (): Promise<void> => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "users" RESTART IDENTITY CASCADE');
  });

  afterAll(async (): Promise<void> => {
    await app.close();
    await prisma.$disconnect();
  });

  it('returns 401 INVALID_BEARER when Authorization header is missing', async (): Promise<void> => {
    const res = await request(app.getHttpServer()).get('/smoke/whoami');
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'INVALID_BEARER' } });
  });

  it('returns 401 INVALID_TOKEN when JWT signature does not match', async (): Promise<void> => {
    const wrongKey = new TextEncoder().encode('wrong-secret-for-mismatch-test');
    const now = Math.floor(Date.now() / 1000);
    const badToken = await new SignJWT({ email: 'mismatch@example.com' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('22222222-2222-2222-2222-222222222222')
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(wrongKey);

    const res = await request(app.getHttpServer())
      .get('/smoke/whoami')
      .set('Authorization', `Bearer ${badToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'INVALID_TOKEN' } });
  });

  it('returns 401 TOKEN_EXPIRED when JWT exp is past the clockTolerance window', async (): Promise<void> => {
    const expiredToken = await signTestJwt({
      sub: '33333333-3333-3333-3333-333333333333',
      email: 'expired@example.com',
      expSecondsFromNow: -100,
    });

    const res = await request(app.getHttpServer())
      .get('/smoke/whoami')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error: { code: 'TOKEN_EXPIRED' } });
  });

  it('returns 200 with the synced user, creating a local row on first authenticated request', async (): Promise<void> => {
    const sub = '11111111-1111-1111-1111-111111111111';
    const email = 'first@example.com';
    const token = await signTestJwt({ sub, email, fullName: 'First User' });

    const res = await request(app.getHttpServer())
      .get('/smoke/whoami')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email, role: 'USER' });
    const body = res.body as WhoamiResponse;
    expect(typeof body.id).toBe('string');

    const row = await prisma.user.findUnique({ where: { supabaseAuthId: sub } });
    expect(row).not.toBeNull();
    expect(row?.id).toBe(body.id);
    expect(row?.email).toBe(email);
    expect(row?.displayName).toBe('First User');
  });

  it('reuses the existing local user on subsequent authenticated requests (idempotent sync)', async (): Promise<void> => {
    const sub = '11111111-1111-1111-1111-111111111111';
    const email = 'idempotent@example.com';
    const token = await signTestJwt({ sub, email });

    const firstRes = await request(app.getHttpServer())
      .get('/smoke/whoami')
      .set('Authorization', `Bearer ${token}`);
    expect(firstRes.status).toBe(200);
    const firstBody = firstRes.body as WhoamiResponse;
    const firstId = firstBody.id;

    const secondRes = await request(app.getHttpServer())
      .get('/smoke/whoami')
      .set('Authorization', `Bearer ${token}`);
    expect(secondRes.status).toBe(200);
    const secondBody = secondRes.body as WhoamiResponse;
    expect(secondBody.id).toBe(firstId);

    const count = await prisma.user.count({ where: { supabaseAuthId: sub } });
    expect(count).toBe(1);
  });
});
