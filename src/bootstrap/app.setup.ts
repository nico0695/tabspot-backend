import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';

import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import type { Env } from '@config/app.config';
import { buildCorsOptions } from '@config/cors.config';

export function setupApp(app: NestExpressApplication): Env {
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  const config = app.get<ConfigService<{ app: Env }>>(ConfigService);
  const appConfig = config.getOrThrow('app', { infer: true });

  app.useBodyParser('json', { limit: appConfig.REQUEST_BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: appConfig.REQUEST_BODY_LIMIT, extended: true });
  app.enableCors(buildCorsOptions(appConfig));

  app.setGlobalPrefix('api', { exclude: ['metrics'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  if (config.get('app.ENABLE_DOCS', { infer: true })) {
    const docConfig = new DocumentBuilder()
      .setTitle('TabSpot API')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, docConfig));
    SwaggerModule.setup('api/docs', app, document);
  }

  return appConfig;
}
