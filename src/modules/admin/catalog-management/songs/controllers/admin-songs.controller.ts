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
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { ApiAdminErrors } from '@common/openapi/api-error-responses.decorator';
import { ErrorResponseDto } from '@common/openapi/error-response.dto';
import type { SongWithArtistAndGenres } from '@modules/catalog/repositories/song.repository';
import { UserRole } from '@src/generated/prisma/client';

import { CreateSongDto } from '../dto/requests/create-song.dto';
import { ListAdminSongsDto } from '../dto/queries/list-admin-songs.dto';
import { UpdateSongDto } from '../dto/requests/update-song.dto';
import { AdminSongResponseDto } from '../dto/responses/admin-song-response.schema';
import type { PaginatedResult } from '@admin/catalog-management/shared/pagination.types';
import { AdminPaginatedSongsDto } from '@admin/shared/dto/responses/admin-paginated.schema';
import { AdminSongsService } from '../services/admin-songs.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/songs', version: '1' })
export class AdminSongsController {
  constructor(private readonly adminSongsService: AdminSongsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Song created', type: AdminSongResponseDto })
  @ApiConflictResponse({
    description: 'Song slug already exists for this artist',
    type: ErrorResponseDto,
  })
  @ApiAdminErrors()
  async create(@Body() body: CreateSongDto): Promise<SongWithArtistAndGenres> {
    return this.adminSongsService.createSong(body);
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated list of songs', type: AdminPaginatedSongsDto })
  @ApiAdminErrors()
  async list(@Query() query: ListAdminSongsDto): Promise<PaginatedResult<SongWithArtistAndGenres>> {
    return this.adminSongsService.listSongs(query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Song details', type: AdminSongResponseDto })
  @ApiNotFoundResponse({ description: 'Song not found', type: ErrorResponseDto })
  @ApiAdminErrors()
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<SongWithArtistAndGenres> {
    return this.adminSongsService.getSong(id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Song updated', type: AdminSongResponseDto })
  @ApiNotFoundResponse({ description: 'Song not found', type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Song slug already exists for this artist',
    type: ErrorResponseDto,
  })
  @ApiAdminErrors()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSongDto,
  ): Promise<SongWithArtistAndGenres> {
    return this.adminSongsService.updateSong(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Song soft-deleted' })
  @ApiNotFoundResponse({ description: 'Song not found', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Song has published tabs', type: ErrorResponseDto })
  @ApiAdminErrors()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminSongsService.deleteSong(id);
  }
}
