import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ErrorResponseDto } from '@common/openapi/error-response.dto';

import { SongService } from './song.service';
import { ListSongsDto } from './dto/queries/list-songs.dto';
import { ListSongsResponseDto } from './dto/responses/list-songs-response.dto';
import { ListSongsResponse } from './dto/responses/list-songs-response.schema';
import { SongDetailResponseDto } from './dto/responses/song-detail-response.dto';
import type { SongDetailResponse } from './dto/responses/song-detail-response.schema';
import { SongSelectResponseDto } from './dto/responses/song-select-response.dto';
import type { SongSelectResponse } from './dto/responses/song-select-response.schema';
import { PaginationQueryDto } from '../shared/dto/queries/pagination-query.dto';

@ApiTags('catalog')
@Controller({ path: 'songs', version: '1' })
export class SongsPublicController {
  constructor(private readonly songService: SongService) {}

  @Get('all')
  @ApiOkResponse({
    description: 'All songs for select/dropdown',
    type: [SongSelectResponseDto],
  })
  async all(): Promise<SongSelectResponse[]> {
    return this.songService.getAllForSelect();
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated list of songs', type: ListSongsResponseDto })
  async list(@Query() query: ListSongsDto): Promise<ListSongsResponse> {
    return this.songService.listSongs(query);
  }

  @Get(':slug')
  @ApiOkResponse({ description: 'Song detail with published tabs', type: SongDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Song not found', type: ErrorResponseDto })
  async detail(
    @Param('slug') slug: string,
    @Query() query: PaginationQueryDto,
  ): Promise<SongDetailResponse> {
    return this.songService.getSongBySlug(slug, { cursor: query.cursor, limit: query.limit });
  }
}
