import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ErrorResponseDto } from '@common/openapi/error-response.dto';

import { TabRatingAggregateDto } from '../dto/rating/tab-rating-aggregate.dto';
import type { TabRatingAggregate } from '../dto/rating/tab-rating-aggregate.schema';
import { TabRatingService } from '../services/tab-rating.service';

@ApiTags('tabs')
@Controller({ path: 'tabs', version: '1' })
export class TabsRatingPublicController {
  constructor(private readonly tabRatingService: TabRatingService) {}

  @Get(':id/rating')
  @ApiOkResponse({
    description: 'Aggregate rating for the tab',
    type: TabRatingAggregateDto,
  })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  async getAggregate(@Param('id', ParseUUIDPipe) id: string): Promise<TabRatingAggregate> {
    const { average, count } = await this.tabRatingService.getAggregate(id);
    return { average, count };
  }
}
