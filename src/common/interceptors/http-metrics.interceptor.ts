import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';

import { MetricsService } from '@modules/metrics/metrics.service';

const SKIP_PATHS = ['/api/v1/health', '/metrics'];

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const path = request.url;

    if (SKIP_PATHS.some((prefix) => path.startsWith(prefix))) {
      return next.handle();
    }

    const method = request.method;
    const startTime = performance.now();

    return next.handle().pipe(
      tap({
        next: (): void => {
          const response = http.getResponse<Response>();
          const durationSeconds = (performance.now() - startTime) / 1000;
          this.metricsService.observeHttpRequest(
            method,
            path,
            response.statusCode,
            durationSeconds,
          );
        },
        error: (error: unknown): void => {
          const statusCode = error instanceof HttpException ? error.getStatus() : 500;
          const durationSeconds = (performance.now() - startTime) / 1000;
          this.metricsService.observeHttpRequest(method, path, statusCode, durationSeconds);
        },
      }),
    );
  }
}
