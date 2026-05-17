import { HttpException, HttpStatus } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { HttpMetricsInterceptor } from '../http-metrics.interceptor';
import type { MetricsService } from '@modules/metrics/metrics.service';

describe('HttpMetricsInterceptor', () => {
  let interceptor: HttpMetricsInterceptor;
  let mockObserve: jest.Mock;

  beforeEach((): void => {
    mockObserve = jest.fn();
    const mockMetricsService = {
      observeHttpRequest: mockObserve,
    } as unknown as MetricsService;
    interceptor = new HttpMetricsInterceptor(mockMetricsService);
  });

  function buildContext(url: string, method = 'GET'): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ url, method }),
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

  it('calls observeHttpRequest with method, path, status, and positive duration on success', (done): void => {
    const context = buildContext('/api/v1/genres');
    const handler = buildHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: (): void => {
        expect(mockObserve).toHaveBeenCalledWith('GET', '/api/v1/genres', 200, expect.any(Number));
        const duration = (mockObserve.mock.calls[0] as number[])[3];
        expect(duration).toBeGreaterThanOrEqual(0);
        done();
      },
    });
  });

  it('records error status from HttpException', (done): void => {
    const context = buildContext('/api/v1/tabs');
    const handler = buildErrorHandler(new HttpException('Not Found', HttpStatus.NOT_FOUND));

    interceptor.intercept(context, handler).subscribe({
      error: (): void => {
        expect(mockObserve).toHaveBeenCalledWith('GET', '/api/v1/tabs', 404, expect.any(Number));
        done();
      },
    });
  });

  it('records 500 for non-HttpException errors', (done): void => {
    const context = buildContext('/api/v1/tabs');
    const handler = buildErrorHandler(new Error('unexpected'));

    interceptor.intercept(context, handler).subscribe({
      error: (): void => {
        expect(mockObserve).toHaveBeenCalledWith('GET', '/api/v1/tabs', 500, expect.any(Number));
        done();
      },
    });
  });

  it('skips /metrics path', (done): void => {
    const context = buildContext('/metrics');
    const handler = buildHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: (): void => {
        expect(mockObserve).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('skips /api/v1/health paths', (done): void => {
    const context = buildContext('/api/v1/health/ready');
    const handler = buildHandler();

    interceptor.intercept(context, handler).subscribe({
      complete: (): void => {
        expect(mockObserve).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
