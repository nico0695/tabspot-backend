import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@SkipThrottle()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  @Get()
  @ApiOkResponse({ description: 'Service health status', type: HealthResponseDto })
  check(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
