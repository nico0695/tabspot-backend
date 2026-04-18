import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import type { Env } from '@config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = app.get<ConfigService<{ app: Env }>>(ConfigService);

  if (config.get('app.ENABLE_DOCS', { infer: true })) {
    const docConfig = new DocumentBuilder().setTitle('TabSpot API').setVersion('1.0.0').build();
    const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, docConfig));
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get('app.PORT', { infer: true }) ?? 3000;
  await app.listen(port);
}

void bootstrap();
