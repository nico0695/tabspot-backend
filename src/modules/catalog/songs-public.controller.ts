import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ErrorResponseDto } from '@common/openapi/error-response.dto';

import { ListSongsResponseDto } from './dto/list-songs-response.dto';
import { ListSongsResponse } from './dto/list-songs-response.schema';
import { ListSongsDto } from './dto/list-songs.dto';
import { SongDetailResponseDto } from './dto/song-detail-response.dto';
import type { SongDetailResponse } from './dto/song-detail-response.schema';
import { SongService } from './song.service';

@ApiTags('catalog')
@Controller({ path: 'songs', version: '1' })
export class SongsPublicController {
  constructor(private readonly songService: SongService) {}

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
    @Query() query: ListSongsDto,
  ): Promise<SongDetailResponse> {
    return this.songService.getSongBySlug(slug, { cursor: query.cursor, limit: query.limit });
  }
}
