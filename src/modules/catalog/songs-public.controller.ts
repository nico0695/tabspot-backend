import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ListSongsResponse } from './dto/list-songs-response.schema';
import { ListSongsDto } from './dto/list-songs.dto';
import { SongService } from './song.service';

@ApiTags('catalog')
@Controller({ path: 'songs', version: '1' })
export class SongsPublicController {
  constructor(private readonly songService: SongService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of songs' })
  async list(@Query() query: ListSongsDto): Promise<ListSongsResponse> {
    return this.songService.listSongs(query);
  }
}
