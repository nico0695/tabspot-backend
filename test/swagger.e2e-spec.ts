import { Test, TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { AppModule } from '@src/app.module';
import { setupApp } from '@src/bootstrap/app.setup';
import { IDENTITY_PROVIDER } from '@modules/auth/ports/identity-provider.port';

import { createE2eIdentityProvider } from './support/e2e-auth';

describe('Swagger (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async (): Promise<void> => {
    process.env['ENABLE_DOCS'] = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(IDENTITY_PROVIDER)
      .useValue(createE2eIdentityProvider())
      .compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>({ bodyParser: false });
    setupApp(app);
    await app.init();
  });

  it('exposes admin tab CRUD endpoints in the swagger document', async (): Promise<void> => {
    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    const body = res.body as {
      paths: Record<string, Record<string, unknown>>;
    };

    expect(body.paths['/api/v1/admin/tabs']).toEqual(
      expect.objectContaining({
        get: expect.any(Object) as object,
        post: expect.any(Object) as object,
      }),
    );
    expect(body.paths['/api/v1/admin/tabs/{id}']).toEqual(
      expect.objectContaining({
        get: expect.any(Object) as object,
        patch: expect.any(Object) as object,
        delete: expect.any(Object) as object,
      }),
    );
    expect(body.paths['/api/v1/admin/tabs/bulk-import']).toEqual(
      expect.objectContaining({
        post: expect.any(Object) as object,
      }),
    );
  });

  afterAll(async (): Promise<void> => {
    await app.close();
  });
});
