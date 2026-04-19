import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ArtistService } from './artist.service';
import { ListArtistsResponse } from './dto/list-artists-response.schema';
import { ListArtistsDto } from './dto/list-artists.dto';

@ApiTags('catalog')
@Controller({ path: 'artists', version: '1' })
export class ArtistsPublicController {
  constructor(private readonly artistService: ArtistService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of artists' })
  async list(@Query() query: ListArtistsDto): Promise<ListArtistsResponse> {
    return this.artistService.listArtists(query);
  }
}
