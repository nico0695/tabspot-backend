import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

import type { Env } from './app.config';

const CORS_METHODS: string[] = ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'];
const CORS_ALLOWED_HEADERS: string[] = ['Authorization', 'Content-Type'];

export function buildCorsOptions(env: Pick<Env, 'CORS_ORIGINS' | 'CORS_CREDENTIALS'>): CorsOptions {
  const allowedOrigins = new Set(env.CORS_ORIGINS);

  return {
    origin(origin, callback): void {
      if (origin === undefined) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: env.CORS_CREDENTIALS,
    methods: CORS_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
  };
}
