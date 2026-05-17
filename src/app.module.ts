import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from '@config/config.module';
import type { Env } from '@config/app.config';
import { HttpMetricsInterceptor } from '@common/interceptors/http-metrics.interceptor';
import { RequestLoggingInterceptor } from '@common/interceptors/request-logging.interceptor';
import { RequestIdMiddleware } from '@common/middlewares/request-id.middleware';
import { AuthModule } from '@modules/auth/auth.module';
import { HealthModule } from '@modules/health/health.module';
import { GenresModule } from '@modules/genres/genres.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { TabsModule } from '@modules/tabs/tabs.module';
import { AdminModule } from '@modules/admin/admin.module';
import { MetricsModule } from '@modules/metrics/metrics.module';
import { SearchModule } from '@modules/search/search.module';
import { PrismaModule } from '@src/prisma/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<{ app: Env }>,
      ): { throttlers: { ttl: number; limit: number }[] } => ({
        throttlers: [
          {
            ttl: (config.get('app.THROTTLE_TTL', { infer: true }) ?? 60) * 1000,
            limit: config.get('app.THROTTLE_LIMIT', { infer: true }) ?? 100,
          },
        ],
      }),
    }),
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<{ app: Env }>) => {
        const nodeEnv = config.get('app.NODE_ENV', { infer: true });
        const isDev = nodeEnv === 'development';
        return {
          pinoHttp: {
            level: isDev ? 'debug' : 'info',
            genReqId: (req): string => (req as { id?: string }).id ?? '',
            transport: isDev
              ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
              : undefined,
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers["x-supabase-service-key"]',
                'req.body.password',
                'req.body.token',
                'req.body.email',
                'req.body.content',
                '*.password',
                '*.token',
              ],
              censor: '[Redacted]',
            },
          },
        };
      },
    }),
    HealthModule,
    GenresModule,
    AuthModule,
    CatalogModule,
    TabsModule,
    AdminModule,
    MetricsModule,
    SearchModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
