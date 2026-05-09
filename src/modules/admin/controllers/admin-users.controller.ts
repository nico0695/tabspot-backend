import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import type { User } from '@src/generated/prisma/client';
import { UserRole } from '@src/generated/prisma/client';

import { ChangeRoleDto } from '../dto/change-role.dto';
import { ListAdminUsersDto } from '../dto/list-admin-users.dto';
import { AdminService } from '../services/admin.service';

@ApiTags('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/users', version: '1' })
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of users (admin)' })
  async list(@Query() query: ListAdminUsersDto): Promise<{
    data: User[];
    pageInfo: { page: number; pageSize: number; totalCount: number; totalPages: number };
  }> {
    const { items, totalCount } = await this.adminService.listUsers(query);
    return {
      data: items,
      pageInfo: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / query.pageSize),
      },
    };
  }

  @Patch(':id/role')
  @ApiOkResponse({ description: 'User role updated' })
  async changeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() body: ChangeRoleDto,
  ): Promise<User> {
    return this.adminService.changeUserRole(id, body.role, user.id);
  }
}
