import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { setupApp } from '@src/bootstrap/app.setup';
import { IDENTITY_PROVIDER } from '@modules/auth/ports/identity-provider.port';
import { PrismaService } from '@src/prisma/prisma.service';

import { bearer, createE2eIdentityProvider, E2E_ADMIN_TOKEN } from './support/e2e-auth';
import {
  resetE2eDatabase,
  seedE2eDatabase,
  E2E_ARTIST_ID,
  E2E_GENRE_ID,
  E2E_ADMIN_ID,
} from './support/e2e-db';

interface BulkImportResponse {
  inserted: { artists: number; songs: number; tabs: number };
  skipped: number;
  results: Array<{
    title: string;
    songStatus: 'created' | 'reused';
    songId: string;
    tabsInserted: number;
    tabsSkipped: number;
  }>;
  errors: Array<{
    index: number;
    title: string;
    code: string;
    message: string;
  }>;
}

const validPayload = {
  artist: { id: E2E_ARTIST_ID, name: 'E2E Artist' },
  defaults: {
    status: 'DRAFT' as const,
    difficulty: 'INTERMEDIATE' as const,
    instrument: 'GUITAR' as const,
  },
  songs: [
    {
      title: 'Bulk Import Song',
      genreIds: [E2E_GENRE_ID],
      versions: [
        {
          content: '{title: Bulk Import Song}\n[C]Hello [G]world',
          tabType: 'CHORDS' as const,
        },
      ],
    },
  ],
};

describe('Bulk Import (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async (): Promise<void> => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IDENTITY_PROVIDER)
      .useValue(createE2eIdentityProvider())
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({ bodyParser: false });
    setupApp(app);
    await app.init();

    prisma = moduleFixture.get(PrismaService);
  });

  beforeEach(async (): Promise<void> => {
    await resetE2eDatabase(prisma);
    await seedE2eDatabase(prisma);
  });

  it('imports a song on the happy path and rejects unauthenticated requests', async (): Promise<void> => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/tabs/bulk-import')
      .send(validPayload)
      .expect(401);

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/tabs/bulk-import')
      .set('Authorization', bearer(E2E_ADMIN_TOKEN))
      .send(validPayload)
      .expect(200);

    const body = res.body as BulkImportResponse;
    expect(body.inserted).toEqual({ artists: 0, songs: 1, tabs: 1 });
    expect(body.skipped).toBe(0);
    expect(body.errors).toEqual([]);
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({
      title: 'Bulk Import Song',
      songStatus: 'created',
      tabsInserted: 1,
      tabsSkipped: 0,
    });

    const tab = await prisma.tab.findFirst({
      where: { songId: body.results[0].songId },
      orderBy: { versionNumber: 'desc' },
    });
    expect(tab).not.toBeNull();
    expect(tab!.versionNumber).toBe(1);
    expect(tab!.authorUserId).toBe(E2E_ADMIN_ID);
    expect(tab!.content).toBe('{title: Bulk Import Song}\n[C]Hello [G]world');
  });

  it('restores a soft-deleted artist matched by slug', async (): Promise<void> => {
    await prisma.artist.update({
      where: { id: E2E_ARTIST_ID },
      data: { deletedAt: new Date() },
    });

    const payload = {
      artist: { name: 'E2E Artist' },
      defaults: {
        status: 'DRAFT' as const,
        difficulty: 'INTERMEDIATE' as const,
        instrument: 'GUITAR' as const,
      },
      songs: [
        {
          title: 'Restored Song',
          versions: [
            {
              content: '{title: Restored Song}\n[Am]Restored',
              tabType: 'CHORDS' as const,
            },
          ],
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/tabs/bulk-import')
      .set('Authorization', bearer(E2E_ADMIN_TOKEN))
      .send(payload)
      .expect(200);

    const body = res.body as BulkImportResponse;
    expect(body.inserted.artists).toBe(0);
    expect(body.results[0].songStatus).toBe('created');

    const artist = await prisma.artist.findUnique({ where: { id: E2E_ARTIST_ID } });
    expect(artist).not.toBeNull();
    expect(artist!.deletedAt).toBeNull();
  });

  it('replays idempotently — second run skips already-inserted content', async (): Promise<void> => {
    const payload = {
      artist: { id: E2E_ARTIST_ID, name: 'E2E Artist' },
      defaults: {
        status: 'DRAFT' as const,
        difficulty: 'INTERMEDIATE' as const,
        instrument: 'GUITAR' as const,
      },
      songs: [
        {
          title: 'Song A',
          versions: [
            {
              content: '{title: Song A}\n[C]Content A',
              tabType: 'CHORDS' as const,
            },
          ],
        },
        {
          title: 'Song B',
          genreIds: ['a0000000-0000-4000-8000-000000000099'],
          versions: [
            {
              content: '{title: Song B}\n[G]Content B',
              tabType: 'CHORDS' as const,
            },
          ],
        },
      ],
    };

    const first = await request(app.getHttpServer())
      .post('/api/v1/admin/tabs/bulk-import')
      .set('Authorization', bearer(E2E_ADMIN_TOKEN))
      .send(payload)
      .expect(200);

    const firstBody = first.body as BulkImportResponse;
    expect(firstBody.inserted.songs).toBe(1);
    expect(firstBody.errors).toHaveLength(1);
    expect(firstBody.errors[0]).toMatchObject({ index: 1, code: 'INVALID_GENRE_IDS' });

    const tabCountBefore = await prisma.tab.count();

    const second = await request(app.getHttpServer())
      .post('/api/v1/admin/tabs/bulk-import')
      .set('Authorization', bearer(E2E_ADMIN_TOKEN))
      .send(payload)
      .expect(200);

    const secondBody = second.body as BulkImportResponse;
    expect(secondBody.inserted.songs).toBe(0);
    expect(secondBody.skipped).toBe(1);
    expect(secondBody.results[0].songStatus).toBe('reused');
    expect(secondBody.results[0].tabsSkipped).toBe(1);
    expect(secondBody.errors).toHaveLength(1);

    const tabCountAfter = await prisma.tab.count();
    expect(tabCountAfter).toBe(tabCountBefore);
  });

  it('isolates per-song failures — valid songs succeed alongside invalid ones', async (): Promise<void> => {
    const payload = {
      artist: { id: E2E_ARTIST_ID, name: 'E2E Artist' },
      defaults: {
        status: 'DRAFT' as const,
        difficulty: 'INTERMEDIATE' as const,
        instrument: 'GUITAR' as const,
      },
      songs: [
        {
          title: 'Valid Song 1',
          versions: [
            {
              content: '{title: Valid 1}\n[C]First',
              tabType: 'CHORDS' as const,
            },
          ],
        },
        {
          title: 'Invalid Song',
          genreIds: ['a0000000-0000-4000-8000-000000000099'],
          versions: [
            {
              content: '{title: Invalid}\n[G]Bad',
              tabType: 'CHORDS' as const,
            },
          ],
        },
        {
          title: 'Valid Song 2',
          versions: [
            {
              content: '{title: Valid 2}\n[Am]Third',
              tabType: 'CHORDS' as const,
            },
          ],
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/tabs/bulk-import')
      .set('Authorization', bearer(E2E_ADMIN_TOKEN))
      .send(payload)
      .expect(200);

    const body = res.body as BulkImportResponse;
    expect(body.inserted.songs).toBe(2);
    expect(body.inserted.tabs).toBe(2);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toMatchObject({
      index: 1,
      title: 'Invalid Song',
      code: 'INVALID_GENRE_IDS',
    });
    expect(body.results).toHaveLength(2);
    expect(body.results[0].songStatus).toBe('created');
    expect(body.results[1].songStatus).toBe('created');

    const songs = await prisma.song.findMany({
      where: {
        artistId: E2E_ARTIST_ID,
        title: { in: ['Valid Song 1', 'Valid Song 2', 'Invalid Song'] },
      },
    });
    expect(songs).toHaveLength(2);
    expect(songs.map((s) => s.title).sort()).toEqual(['Valid Song 1', 'Valid Song 2']);
  });

  afterAll(async (): Promise<void> => {
    await resetE2eDatabase(prisma);
    await app.close();
  });
});
