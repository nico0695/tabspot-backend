import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { ApiAuthErrors } from '@common/openapi/api-error-responses.decorator';
import { ErrorResponseDto } from '@common/openapi/error-response.dto';
import type { User } from '@src/generated/prisma/client';

import { ListUserTabsResponseDto } from '../dto/user/list-user-tabs-response.dto';
import type { ListUserTabsResponse } from '../dto/user/list-user-tabs-response.schema';
import { ListUserTabsDto } from '../dto/user/list-user-tabs.dto';
import { CreateTabDto } from '../dto/user/create-tab.dto';
import { UpdateTabDto } from '../dto/user/update-tab.dto';
import { UserTabResponseDto } from '../dto/user/user-tab-response.dto';
import type { UserTabResponse } from '../dto/user/user-tab-response.schema';
import { TabsService } from '../tabs.service';

function toUserTabResponse(tab: {
  id: string;
  songId: string;
  authorUserId: string;
  titleOverride: string | null;
  content: string;
  tabType: string;
  instrument: string;
  difficulty: string;
  status: string;
  versionNumber: number;
  submittedAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserTabResponse {
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
    versionNumber: tab.versionNumber,
    submittedAt: tab.submittedAt?.toISOString() ?? null,
    publishedAt: tab.publishedAt?.toISOString() ?? null,
    createdAt: tab.createdAt.toISOString(),
    updatedAt: tab.updatedAt.toISOString(),
  };
}

@ApiTags('tabs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'me/tabs', version: '1' })
export class TabsUserController {
  constructor(private readonly tabsService: TabsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Tab created as DRAFT', type: UserTabResponseDto })
  @ApiAuthErrors()
  async create(@CurrentUser() user: User, @Body() body: CreateTabDto): Promise<UserTabResponse> {
    const tab = await this.tabsService.createTab({ ...body, authorUserId: user.id });
    return toUserTabResponse(tab);
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated list of own tabs', type: ListUserTabsResponseDto })
  @ApiAuthErrors()
  async list(
    @CurrentUser() user: User,
    @Query() query: ListUserTabsDto,
  ): Promise<ListUserTabsResponse> {
    const { items, nextCursor, hasMore } = await this.tabsService.listUserTabs(user.id, query);
    return {
      data: items.map(toUserTabResponse),
      pageInfo: { nextCursor, hasMore },
    };
  }

  @Put(':id')
  @ApiOkResponse({ description: 'Tab updated', type: UserTabResponseDto })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Tab status does not allow editing', type: ErrorResponseDto })
  @ApiAuthErrors()
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTabDto,
  ): Promise<UserTabResponse> {
    const tab = await this.tabsService.updateTab(id, user.id, body);
    return toUserTabResponse(tab);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Tab submitted for review', type: UserTabResponseDto })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Invalid status transition', type: ErrorResponseDto })
  @ApiAuthErrors()
  async submit(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserTabResponse> {
    const tab = await this.tabsService.submitTab(id, user.id);
    return toUserTabResponse(tab);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Tab soft-deleted' })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  @ApiAuthErrors()
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tabsService.softDeleteTab(id, user.id);
  }
}
