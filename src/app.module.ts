import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from '@config/config.module';
import type { Env } from '@config/app.config';
import { RequestIdMiddleware } from '@common/middlewares/request-id.middleware';
import { HealthModule } from '@modules/health/health.module';

@Module({
  imports: [
    AppConfigModule,
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
