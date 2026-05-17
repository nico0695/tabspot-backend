import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const path = request.url;

    if (path.startsWith('/api/v1/health')) {
      return next.handle();
    }

    const method = request.method;
    const requestId = (request as Request & { id?: string }).id ?? '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (): void => {
          const response = http.getResponse<Response>();
          const durationMs = Date.now() - startTime;
          this.logger.log({ method, path, statusCode: response.statusCode, durationMs, requestId });
        },
        error: (error: unknown): void => {
          const durationMs = Date.now() - startTime;
          const statusCode = error instanceof HttpException ? error.getStatus() : 500;
          this.logger.warn({ method, path, statusCode, durationMs, requestId });
        },
      }),
    );
  }
}
