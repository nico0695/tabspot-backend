import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { setupApp } from '@src/bootstrap/app.setup';
import { IDENTITY_PROVIDER } from '@modules/auth/ports/identity-provider.port';
import { PrismaService } from '@src/prisma/prisma.service';

import {
  bearer,
  createE2eIdentityProvider,
  E2E_ADMIN_TOKEN,
  E2E_USER_TOKEN,
} from './support/e2e-auth';
import { resetE2eDatabase, seedE2eDatabase } from './support/e2e-db';

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
}

interface MeResponse {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  status: string;
}

interface TabResponse {
  id: string;
  songId: string;
  authorUserId: string;
  titleOverride: string | null;
  content: string;
  tabType: string;
  instrument: string;
  difficulty: string;
  status: string;
  versionNumber: number;
  submittedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListPublishedTabsResponse {
  data: Array<{
    id: string;
    songId: string;
    titleOverride: string | null;
    status: string;
  }>;
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
  };
}

describe('App (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let songId: string;

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
    await resetE2eDatabase(prisma);
    const seed = await seedE2eDatabase(prisma);
    songId = seed.songId;
  });

  it('GET /api/v1/health returns service status', async (): Promise<void> => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    const body = res.body as Partial<HealthResponse>;

    expect(body).toMatchObject({ status: 'ok' });
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.uptime).toBe('number');
  });

  it('runs the beta tab publishing and rejection flow', async (): Promise<void> => {
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', bearer(E2E_USER_TOKEN))
      .expect(200);
    const me = meRes.body as MeResponse;
    expect(me).toMatchObject({
      email: 'e2e-user@example.com',
      displayName: 'E2E User',
      role: 'USER',
      status: 'ACTIVE',
    });

    const createPayload = {
      songId,
      content: '{title: E2E Song}\n[C]Hello [G]world',
      tabType: 'CHORDS',
      instrument: 'GUITAR',
      difficulty: 'BEGINNER',
    };

    const publishedCreateRes = await request(app.getHttpServer())
      .post('/api/v1/me/tabs')
      .set('Authorization', bearer(E2E_USER_TOKEN))
      .send({ ...createPayload, titleOverride: 'E2E Published Tab' })
      .expect(201);
    const publishedDraft = publishedCreateRes.body as TabResponse;
    expect(publishedDraft).toMatchObject({ status: 'DRAFT', songId });

    const rejectedCreateRes = await request(app.getHttpServer())
      .post('/api/v1/me/tabs')
      .set('Authorization', bearer(E2E_USER_TOKEN))
      .send({ ...createPayload, titleOverride: 'E2E Rejected Tab' })
      .expect(201);
    const rejectedDraft = rejectedCreateRes.body as TabResponse;
    expect(rejectedDraft).toMatchObject({ status: 'DRAFT', songId });

    const publishedSubmitRes = await request(app.getHttpServer())
      .post(`/api/v1/me/tabs/${publishedDraft.id}/submit`)
      .set('Authorization', bearer(E2E_USER_TOKEN))
      .expect(200);
    const publishedPending = publishedSubmitRes.body as TabResponse;
    expect(publishedPending.status).toBe('PENDING');

    const rejectedSubmitRes = await request(app.getHttpServer())
      .post(`/api/v1/me/tabs/${rejectedDraft.id}/submit`)
      .set('Authorization', bearer(E2E_USER_TOKEN))
      .expect(200);
    const rejectedPending = rejectedSubmitRes.body as TabResponse;
    expect(rejectedPending.status).toBe('PENDING');

    const publishRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/tabs/${publishedDraft.id}/publish`)
      .set('Authorization', bearer(E2E_ADMIN_TOKEN))
      .expect(200);
    const publishedTab = publishRes.body as TabResponse;
    expect(publishedTab.status).toBe('PUBLISHED');
    expect(publishedTab.publishedAt).not.toBeNull();

    const rejectRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/tabs/${rejectedDraft.id}/reject`)
      .set('Authorization', bearer(E2E_ADMIN_TOKEN))
      .send({ notes: 'Not ready for beta publishing' })
      .expect(200);
    const rejectedTab = rejectRes.body as TabResponse;
    expect(rejectedTab.status).toBe('REJECTED');

    const publicListRes = await request(app.getHttpServer())
      .get('/api/v1/tabs?limit=20')
      .expect(200);
    const publicList = publicListRes.body as ListPublishedTabsResponse;
    const publicIds = publicList.data.map((tab) => tab.id);
    expect(publicIds).toContain(publishedDraft.id);
    expect(publicIds).not.toContain(rejectedDraft.id);

    const publicDetailRes = await request(app.getHttpServer())
      .get(`/api/v1/tabs/${publishedDraft.id}`)
      .expect(200);
    const publicDetail = publicDetailRes.body as TabResponse;
    expect(publicDetail).toMatchObject({
      id: publishedDraft.id,
      status: 'PUBLISHED',
      content: createPayload.content,
    });

    await request(app.getHttpServer()).get(`/api/v1/tabs/${rejectedDraft.id}`).expect(404);
  });

  afterAll(async (): Promise<void> => {
    await resetE2eDatabase(prisma);
    await app.close();
  });
});
