import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { unauthorizedExample } from '@common/openapi/error-examples';
import {
  ApiBadRequestErrorResponse,
  ApiConflictErrorResponse,
  ApiForbiddenErrorResponse,
  ApiNotFoundErrorResponse,
  ApiUnauthorizedErrorResponse,
  ApiValidationErrorResponse,
} from '@common/openapi/swagger-error-responses';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import type { Artist } from '@src/generated/prisma/client';
import { UserRole } from '@src/generated/prisma/client';

import {
  adminArtistResponseExample,
  artistHasSongsExample,
  artistNotFoundExample,
  artistSlugConflictExample,
  listAdminArtistsResponseExample,
} from '../dto/admin-openapi.examples';
import { AdminArtistResponseDto } from '../dto/admin-artist-response.dto';
import { CreateArtistDto } from '../dto/create-artist.dto';
import { ListAdminArtistsDto } from '../dto/list-admin-artists.dto';
import { ListAdminArtistsResponseDto } from '../dto/list-admin-artists-response.dto';
import { UpdateArtistDto } from '../dto/update-artist.dto';
import type { PaginatedResult } from '../services/admin-catalog.service';
import { AdminCatalogService } from '../services/admin-catalog.service';

@ApiTags('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/artists', version: '1' })
export class AdminArtistsController {
  constructor(private readonly adminCatalogService: AdminCatalogService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description: 'Artist created',
    type: AdminArtistResponseDto,
    example: adminArtistResponseExample,
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiValidationErrorResponse()
  @ApiConflictErrorResponse({ example: artistSlugConflictExample })
  async create(@Body() body: CreateArtistDto): Promise<Artist> {
    return this.adminCatalogService.createArtist(body);
  }

  @Get()
  @ApiOkResponse({
    description: 'Paginated list of artists (admin)',
    type: ListAdminArtistsResponseDto,
    example: listAdminArtistsResponseExample,
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiValidationErrorResponse()
  async list(@Query() query: ListAdminArtistsDto): Promise<PaginatedResult<Artist>> {
    return this.adminCatalogService.listArtists(query);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Artist detail (admin)',
    type: AdminArtistResponseDto,
    example: adminArtistResponseExample,
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiBadRequestErrorResponse()
  @ApiNotFoundErrorResponse({ example: artistNotFoundExample })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<Artist> {
    return this.adminCatalogService.getArtist(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'Artist updated',
    type: AdminArtistResponseDto,
    example: { ...adminArtistResponseExample, name: 'Pink Floyd', slug: 'pink-floyd' },
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiBadRequestErrorResponse()
  @ApiValidationErrorResponse()
  @ApiNotFoundErrorResponse({ example: artistNotFoundExample })
  @ApiConflictErrorResponse({ example: artistSlugConflictExample })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateArtistDto,
  ): Promise<Artist> {
    return this.adminCatalogService.updateArtist(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Artist soft-deleted' })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiBadRequestErrorResponse()
  @ApiNotFoundErrorResponse({ example: artistNotFoundExample })
  @ApiConflictErrorResponse({ example: artistHasSongsExample })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminCatalogService.deleteArtist(id);
  }
}
