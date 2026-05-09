import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ErrorResponseDto } from '@common/openapi/error-response.dto';

import { ArtistService } from './artist.service';
import { ArtistDetailResponseDto } from './dto/artist-detail-response.dto';
import type { ArtistDetailResponse } from './dto/artist-detail-response.schema';
import { ListArtistsResponseDto } from './dto/list-artists-response.dto';
import { ListArtistsResponse } from './dto/list-artists-response.schema';
import { ListArtistsDto } from './dto/list-artists.dto';

@ApiTags('catalog')
@Controller({ path: 'artists', version: '1' })
export class ArtistsPublicController {
  constructor(private readonly artistService: ArtistService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated list of artists', type: ListArtistsResponseDto })
  async list(@Query() query: ListArtistsDto): Promise<ListArtistsResponse> {
    return this.artistService.listArtists(query);
  }

  @Get(':slug')
  @ApiOkResponse({
    description: 'Artist detail with associated songs',
    type: ArtistDetailResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Artist not found', type: ErrorResponseDto })
  async detail(@Param('slug') slug: string): Promise<ArtistDetailResponse> {
    return this.artistService.getArtistBySlug(slug);
  }
}
