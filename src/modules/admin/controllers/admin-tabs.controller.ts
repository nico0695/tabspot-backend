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
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ApiAdminErrors } from '@common/openapi/api-error-responses.decorator';
import { ErrorResponseDto } from '@common/openapi/error-response.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import type { Tab, User } from '@src/generated/prisma/client';
import { UserRole } from '@src/generated/prisma/client';
import type { TabWithAuthor } from '@modules/tabs/ports/tab-repository.port';

import { ListAdminTabsDto } from '../dto/list-admin-tabs.dto';
import { RejectTabDto } from '../dto/reject-tab.dto';
import { AdminPaginatedTabsDto, AdminTabResponseDto } from '../dto/responses';
import { AdminService } from '../services/admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/tabs', version: '1' })
export class AdminTabsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of all tabs (admin)', type: AdminPaginatedTabsDto })
  @ApiAdminErrors()
  async list(@Query() query: ListAdminTabsDto): Promise<{
    data: TabWithAuthor[];
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
  @ApiOkResponse({ description: 'Tab published', type: AdminTabResponseDto })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  @ApiAdminErrors()
  async publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User): Promise<Tab> {
    return this.adminService.publishTab(id, user.id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Tab rejected', type: AdminTabResponseDto })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  @ApiAdminErrors()
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() body: RejectTabDto,
  ): Promise<Tab> {
    return this.adminService.rejectTab(id, user.id, body.notes);
  }
}
