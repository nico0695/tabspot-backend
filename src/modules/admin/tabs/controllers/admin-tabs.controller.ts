import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ApiAdminErrors } from '@common/openapi/api-error-responses.decorator';
import { ErrorResponseDto } from '@common/openapi/error-response.dto';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import type { Tab, User } from '@src/generated/prisma/client';
import { UserRole } from '@src/generated/prisma/client';
import type { AdminTabRow } from '@modules/tabs/ports/tab-repository.port';

import { CreateAdminTabDto } from '../dto/requests/create-admin-tab.dto';
import { ListAdminTabsDto } from '../dto/queries/list-admin-tabs.dto';
import { RejectTabDto } from '../dto/requests/reject-tab.dto';
import { UpdateAdminTabDto } from '../dto/requests/update-admin-tab.dto';
import type { AdminTabWithRelationsResponse } from '../dto/responses/admin-tab-response.schema';
import {
  AdminTabResponseDto,
  AdminTabWithRelationsResponseDto,
} from '../dto/responses/admin-tab-response.schema';
import { AdminPaginatedTabsDto } from '../../shared/dto/responses/admin-paginated.schema';
import { AdminTabsService } from '../services/admin-tabs.service';

function toAdminTabResponse(tab: AdminTabRow): AdminTabWithRelationsResponse {
  return {
    id: tab.id,
    songId: tab.songId,
    authorUserId: tab.authorUserId,
    titleOverride: tab.titleOverride,
    content: tab.content,
    tabType: tab.tabType,
    instrument: tab.instrument,
    difficulty: tab.difficulty,
    status: tab.status,
    submittedAt: tab.submittedAt?.toISOString() ?? null,
    publishedAt: tab.publishedAt?.toISOString() ?? null,
    moderatedByUserId: tab.moderatedByUserId,
    moderationNotes: tab.moderationNotes,
    versionNumber: tab.versionNumber,
    createdAt: tab.createdAt.toISOString(),
    updatedAt: tab.updatedAt.toISOString(),
    deletedAt: tab.deletedAt?.toISOString() ?? null,
    author: {
      id: tab.author.id,
      displayName: tab.author.displayName,
      email: tab.author.email,
      status: tab.author.status,
      role: tab.author.role,
    },
    song: {
      id: tab.song.id,
      title: tab.song.title,
      slug: tab.song.slug,
      deletedAt: tab.song.deletedAt?.toISOString() ?? null,
      artist: {
        id: tab.song.artist.id,
        name: tab.song.artist.name,
        slug: tab.song.artist.slug,
      },
    },
  };
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/tabs', version: '1' })
export class AdminTabsController {
  constructor(private readonly adminTabsService: AdminTabsService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of all tabs (admin)', type: AdminPaginatedTabsDto })
  @ApiAdminErrors()
  async list(@Query() query: ListAdminTabsDto): Promise<{
    data: AdminTabWithRelationsResponse[];
    pageInfo: { page: number; pageSize: number; totalCount: number; totalPages: number };
  }> {
    const { items, totalCount } = await this.adminTabsService.listTabs(query);
    return {
      data: items.map(toAdminTabResponse),
      pageInfo: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / query.pageSize),
      },
    };
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Admin tab detail', type: AdminTabWithRelationsResponseDto })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  @ApiAdminErrors()
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<AdminTabWithRelationsResponse> {
    return toAdminTabResponse(await this.adminTabsService.getTabById(id));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Tab created by admin', type: AdminTabResponseDto })
  @ApiAdminErrors()
  async create(@CurrentUser() user: User, @Body() body: CreateAdminTabDto): Promise<Tab> {
    return this.adminTabsService.createTab(body, user.id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Tab updated by admin', type: AdminTabResponseDto })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  @ApiAdminErrors()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() body: UpdateAdminTabDto,
  ): Promise<Tab> {
    return this.adminTabsService.updateTab(id, body, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Tab soft-deleted by admin' })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  @ApiAdminErrors()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminTabsService.deleteTab(id);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Tab published', type: AdminTabResponseDto })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  @ApiAdminErrors()
  async publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User): Promise<Tab> {
    return this.adminTabsService.publishTab(id, user.id);
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
    return this.adminTabsService.rejectTab(id, user.id, body.notes);
  }
}
