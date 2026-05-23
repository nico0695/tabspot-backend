import { Injectable, type OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry();

  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'] as const,
    registers: [this.registry],
  });

  private readonly httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }

  observeHttpRequest(method: string, path: string, status: number, durationSeconds: number): void {
    const normalizedPath = this.normalizePath(path);
    this.httpRequestsTotal.inc({ method, path: normalizedPath, status: String(status) });
    this.httpRequestDurationSeconds.observe({ method, path: normalizedPath }, durationSeconds);
  }

  private normalizePath(path: string): string {
    return path.replace(UUID_PATTERN, ':id');
  }
}
