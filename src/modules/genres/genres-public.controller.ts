import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { GenreResponseDto } from './dto/genre-response.dto';
import type { GenreResponse } from './dto/genre-response.schema';
import { ListGenresDto } from './dto/list-genres.dto';
import { ListGenresResponseDto } from './dto/list-genres-response.dto';
import { ListGenresResponse } from './dto/list-genres-response.schema';
import { GenresService } from './genres.service';

@ApiTags('genres')
@Controller({ path: 'genres', version: '1' })
export class GenresPublicController {
  constructor(private readonly genresService: GenresService) {}

  @Get('all')
  @ApiOkResponse({ description: 'All genres for select/dropdown', type: [GenreResponseDto] })
  async all(): Promise<GenreResponse[]> {
    return this.genresService.getAllForSelect();
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated list of genres', type: ListGenresResponseDto })
  async list(@Query() query: ListGenresDto): Promise<ListGenresResponse> {
    return this.genresService.listGenres(query);
  }
}
