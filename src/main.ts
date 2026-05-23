import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { setupApp } from '@src/bootstrap/app.setup';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  const appConfig = setupApp(app);

  await app.listen(appConfig.PORT);
}

void bootstrap();
