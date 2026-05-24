import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ErrorResponseDto } from '@common/openapi/error-response.dto';

import { ArtistService } from './artist.service';
import { ListArtistsDto } from './dto/queries/list-artists.dto';
import { ArtistDetailResponseDto } from './dto/responses/artist-detail-response.dto';
import type { ArtistDetailResponse } from './dto/responses/artist-detail-response.schema';
import { ArtistSelectResponseDto } from './dto/responses/artist-select-response.dto';
import type { ArtistSelectResponse } from './dto/responses/artist-select-response.schema';
import { ListArtistsResponseDto } from './dto/responses/list-artists-response.dto';
import { ListArtistsResponse } from './dto/responses/list-artists-response.schema';

@ApiTags('catalog')
@Controller({ path: 'artists', version: '1' })
export class ArtistsPublicController {
  constructor(private readonly artistService: ArtistService) {}

  @Get('all')
  @ApiOkResponse({
    description: 'All artists for select/dropdown',
    type: [ArtistSelectResponseDto],
  })
  async all(): Promise<ArtistSelectResponse[]> {
    return this.artistService.getAllForSelect();
  }

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
