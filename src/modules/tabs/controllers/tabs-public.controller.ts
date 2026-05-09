import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { OptionalAuthGuard } from '@common/guards/optional-auth.guard';
import type { User } from '@src/generated/prisma/client';

import type { ListPublishedTabsResponse } from '../dto/public/list-published-tabs-response.schema';
import { ListPublishedTabsDto } from '../dto/public/list-published-tabs.dto';
import type { TabDetail } from '../dto/public/tab-detail.schema';
import type { TabListItem } from '../dto/public/tab-list-item.schema';
import type { TabWithAuthor } from '../ports/tab-repository.port';
import { TabsService } from '../tabs.service';

function toTabListItem(tab: TabWithAuthor): TabListItem {
  return {
    id: tab.id,
    songId: tab.songId,
    titleOverride: tab.titleOverride,
    tabType: tab.tabType,
    instrument: tab.instrument,
    difficulty: tab.difficulty,
    status: tab.status,
    authorDisplayName: tab.author.displayName,
    createdAt: tab.createdAt,
  };
}

function toTabDetail(tab: TabWithAuthor): TabDetail {
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
    authorDisplayName: tab.author.displayName,
    versionNumber: tab.versionNumber,
    submittedAt: tab.submittedAt,
    publishedAt: tab.publishedAt,
    createdAt: tab.createdAt,
    updatedAt: tab.updatedAt,
  };
}

@ApiTags('tabs')
@Controller({ path: 'tabs', version: '1' })
export class TabsPublicController {
  constructor(private readonly tabsService: TabsService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of published tabs' })
  async list(@Query() query: ListPublishedTabsDto): Promise<ListPublishedTabsResponse> {
    const { items, nextCursor, hasMore } = await this.tabsService.listPublished(query);
    return {
      data: items.map(toTabListItem),
      pageInfo: { nextCursor, hasMore },
    };
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiOkResponse({ description: 'Tab detail with audience-aware visibility' })
  async detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User | undefined,
  ): Promise<TabDetail> {
    const tab = await this.tabsService.findPublicDetail(id, user);
    return toTabDetail(tab);
  }
}
