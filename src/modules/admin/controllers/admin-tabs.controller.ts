import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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

import { ListAdminTabsDto } from '../dto/list-admin-tabs.dto';
import { RejectTabDto } from '../dto/reject-tab.dto';
import { AdminService } from '../services/admin.service';

@ApiTags('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/tabs', version: '1' })
export class AdminTabsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of all tabs (admin)' })
  async list(@Query() query: ListAdminTabsDto): Promise<{
    data: unknown[];
    pageInfo: { page: number; pageSize: number; totalCount: number; totalPages: number };
  }> {
    const { items, totalCount } = await this.adminService.listTabs(query);
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

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Tab published' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<unknown> {
    return this.adminService.publishTab(id, user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Tab rejected' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() body: RejectTabDto,
  ): Promise<unknown> {
    return this.adminService.rejectTab(id, user.id, body.notes);
  }
}
