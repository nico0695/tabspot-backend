import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { UserRole } from '@src/generated/prisma/client';

import type { DashboardData } from '../services/admin.service';
import { AdminService } from '../services/admin.service';

@ApiTags('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/dashboard', version: '1' })
export class AdminDashboardController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOkResponse({ description: 'Dashboard metrics' })
  async dashboard(): Promise<DashboardData> {
    return this.adminService.getDashboard();
  }
}
