import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { ApiAdminErrors } from '@common/openapi/api-error-responses.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { UserRole } from '@src/generated/prisma/client';

import { AdminDashboardResponseDto } from '../dto/responses/admin-dashboard-response.schema';
import type { DashboardData } from '../services/admin-dashboard.service';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/dashboard', version: '1' })
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  @ApiOkResponse({ description: 'Dashboard metrics', type: AdminDashboardResponseDto })
  @ApiAdminErrors()
  async dashboard(): Promise<DashboardData> {
    return this.adminDashboardService.getDashboard();
  }
}
