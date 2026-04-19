import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ListGenresDto } from './dto/list-genres.dto';
import { ListGenresResponse } from './dto/list-genres-response.schema';
import { GenresService } from './genres.service';

@ApiTags('genres')
@Controller({ path: 'genres', version: '1' })
export class GenresPublicController {
  constructor(private readonly genresService: GenresService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of genres' })
  async list(@Query() query: ListGenresDto): Promise<ListGenresResponse> {
    return this.genresService.listGenres(query);
  }
}
