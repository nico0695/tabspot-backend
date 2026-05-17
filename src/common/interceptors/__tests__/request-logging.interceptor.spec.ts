import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { RequestLoggingInterceptor } from '../request-logging.interceptor';

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach((): void => {
    interceptor = new RequestLoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach((): void => {
    jest.restoreAllMocks();
  });

  function buildContext(url: string, method = 'GET'): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ url, method, id: 'req-123' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;
  }

  function buildHandler(value: unknown = { ok: true }): CallHandler {
    return { handle: () => of(value) } as CallHandler;
  }

  function buildErrorHandler(error: Error): CallHandler {
    return { handle: () => throwError(() => error) } as CallHandler;
  }

  it('logs info with method, path, statusCode, durationMs, requestId on success', (done): void => {
    const context = buildContext('/api/v1/genres');
    const handler = buildHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: (): void => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            path: '/api/v1/genres',
            statusCode: 200,
            requestId: 'req-123',
          }),
        );
        const logged = (logSpy.mock.calls[0] as Record<string, unknown>[])[0];
        expect(typeof logged.durationMs).toBe('number');
        expect(logged.durationMs).toBeGreaterThanOrEqual(0);
        done();
      },
    });
  });

  it('logs warn with status code from HttpException on error', (done): void => {
    const context = buildContext('/api/v1/tabs');
    const handler = buildErrorHandler(new HttpException('Not Found', HttpStatus.NOT_FOUND));

    interceptor.intercept(context, handler).subscribe({
      error: (): void => {
        expect(warnSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            path: '/api/v1/tabs',
            statusCode: 404,
          }),
        );
        done();
      },
    });
  });

  it('logs warn with status 500 for non-HttpException errors', (done): void => {
    const context = buildContext('/api/v1/tabs');
    const handler = buildErrorHandler(new Error('unexpected'));

    interceptor.intercept(context, handler).subscribe({
      error: (): void => {
        expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
        done();
      },
    });
  });

  it('skips logging for health endpoints', (done): void => {
    const context = buildContext('/api/v1/health');
    const handler = buildHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: (): void => {
        expect(logSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('skips logging for health/ready endpoints', (done): void => {
    const context = buildContext('/api/v1/health/ready');
    const handler = buildHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: (): void => {
        expect(logSpy).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
