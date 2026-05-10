import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { THROTTLE_SEARCH } from '@common/constants/throttle';

import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResponseDto } from './dto/search-response.dto';
import type { SearchResponse } from './dto/search-response.schema';
import { SearchService } from './search.service';

@ApiTags('search')
@Throttle(THROTTLE_SEARCH)
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOkResponse({ description: 'Grouped search results', type: SearchResponseDto })
  async search(@Query() query: SearchQueryDto): Promise<SearchResponse> {
    return this.searchService.search(query);
  }
}
