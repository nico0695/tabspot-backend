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
import type { SongWithArtistAndGenres } from '@modules/catalog/repositories/song.repository';
import { UserRole } from '@src/generated/prisma/client';

import {
  adminSongResponseExample,
  artistDeletedExample,
  invalidGenreIdsExample,
  listAdminSongsResponseExample,
  songHasPublishedTabsExample,
  songNotFoundExample,
  songSlugConflictExample,
} from '../dto/admin-openapi.examples';
import { AdminSongResponseDto } from '../dto/admin-song-response.dto';
import { CreateSongDto } from '../dto/create-song.dto';
import { ListAdminSongsDto } from '../dto/list-admin-songs.dto';
import { ListAdminSongsResponseDto } from '../dto/list-admin-songs-response.dto';
import { UpdateSongDto } from '../dto/update-song.dto';
import type { PaginatedResult } from '../services/admin-catalog.service';
import { AdminCatalogService } from '../services/admin-catalog.service';

@ApiTags('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/songs', version: '1' })
export class AdminSongsController {
  constructor(private readonly adminCatalogService: AdminCatalogService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    description: 'Song created',
    type: AdminSongResponseDto,
    example: adminSongResponseExample,
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiValidationErrorResponse()
  @ApiConflictErrorResponse({ example: songSlugConflictExample })
  @ApiNotFoundErrorResponse({
    description: 'Artist not found or has been deleted',
    example: artistDeletedExample,
  })
  @ApiValidationErrorResponse({
    description: 'One or more genre IDs are invalid',
    example: invalidGenreIdsExample,
  })
  async create(@Body() body: CreateSongDto): Promise<SongWithArtistAndGenres> {
    return this.adminCatalogService.createSong(body);
  }

  @Get()
  @ApiOkResponse({
    description: 'Paginated list of songs (admin)',
    type: ListAdminSongsResponseDto,
    example: listAdminSongsResponseExample,
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiValidationErrorResponse()
  async list(@Query() query: ListAdminSongsDto): Promise<PaginatedResult<SongWithArtistAndGenres>> {
    return this.adminCatalogService.listSongs(query);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Song detail (admin)',
    type: AdminSongResponseDto,
    example: adminSongResponseExample,
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiBadRequestErrorResponse()
  @ApiNotFoundErrorResponse({ example: songNotFoundExample })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<SongWithArtistAndGenres> {
    return this.adminCatalogService.getSong(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'Song updated',
    type: AdminSongResponseDto,
    example: { ...adminSongResponseExample, title: 'New Title', slug: 'new-title' },
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiBadRequestErrorResponse()
  @ApiValidationErrorResponse()
  @ApiNotFoundErrorResponse({ example: songNotFoundExample })
  @ApiConflictErrorResponse({ example: songSlugConflictExample })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSongDto,
  ): Promise<SongWithArtistAndGenres> {
    return this.adminCatalogService.updateSong(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Song soft-deleted' })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiBadRequestErrorResponse()
  @ApiNotFoundErrorResponse({ example: songNotFoundExample })
  @ApiConflictErrorResponse({ example: songHasPublishedTabsExample })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminCatalogService.deleteSong(id);
  }
}
