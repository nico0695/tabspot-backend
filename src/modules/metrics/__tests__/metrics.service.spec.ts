import { MetricsService } from '../metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach((): void => {
    service = new MetricsService();
    service.onModuleInit();
  });

  it('returns default Node.js metrics after init', async (): Promise<void> => {
    const metrics = await service.getMetrics();
    expect(metrics).toContain('process_cpu_seconds_total');
    expect(metrics).toContain('nodejs_heap_size_total_bytes');
  });

  it('returns prometheus content type', (): void => {
    const contentType = service.getContentType();
    expect(contentType).toContain('text/plain');
  });

  it('increments http_requests_total counter', async (): Promise<void> => {
    service.observeHttpRequest('GET', '/api/v1/genres', 200, 0.05);
    service.observeHttpRequest('GET', '/api/v1/genres', 200, 0.03);

    const metrics = await service.getMetrics();
    expect(metrics).toContain(
      'http_requests_total{method="GET",path="/api/v1/genres",status="200"} 2',
    );
  });

  it('records http_request_duration_seconds histogram', async (): Promise<void> => {
    service.observeHttpRequest('POST', '/api/v1/me/tabs', 201, 0.15);

    const metrics = await service.getMetrics();
    expect(metrics).toContain('http_request_duration_seconds_bucket');
    expect(metrics).toContain('method="POST"');
  });

  it('normalizes UUIDs in paths to :id', async (): Promise<void> => {
    service.observeHttpRequest(
      'GET',
      '/api/v1/tabs/550e8400-e29b-41d4-a716-446655440000',
      200,
      0.01,
    );

    const metrics = await service.getMetrics();
    expect(metrics).toContain('path="/api/v1/tabs/:id"');
    expect(metrics).not.toContain('550e8400');
  });

  it('normalizes multiple UUIDs in a single path', async (): Promise<void> => {
    service.observeHttpRequest(
      'POST',
      '/api/v1/tabs/550e8400-e29b-41d4-a716-446655440000/rate',
      200,
      0.02,
    );

    const metrics = await service.getMetrics();
    expect(metrics).toContain('path="/api/v1/tabs/:id/rate"');
  });
});
