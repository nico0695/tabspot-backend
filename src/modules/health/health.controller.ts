import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';

import { HealthResponseDto } from './dto/health-response.dto';
import { PrismaHealthIndicator } from './indicators/prisma-health.indicator';

@ApiTags('health')
@SkipThrottle()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Liveness probe', type: HealthResponseDto })
  check(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOkResponse({ description: 'Readiness probe — all dependencies healthy' })
  @ApiServiceUnavailableResponse({ description: 'One or more dependencies unhealthy' })
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([
      (): Promise<HealthIndicatorResult> => this.prismaHealth.isHealthy('database'),
    ]);
  }
}
