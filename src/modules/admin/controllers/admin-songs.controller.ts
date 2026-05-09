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
import { ApiTags } from '@nestjs/swagger';

import { Roles } from '@common/decorators/roles.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import type { SongWithArtistAndGenres } from '@modules/catalog/repositories/song.repository';
import { UserRole } from '@src/generated/prisma/client';

import { CreateSongDto } from '../dto/create-song.dto';
import { ListAdminSongsDto } from '../dto/list-admin-songs.dto';
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
  async create(@Body() body: CreateSongDto): Promise<SongWithArtistAndGenres> {
    return this.adminCatalogService.createSong(body);
  }

  @Get()
  async list(@Query() query: ListAdminSongsDto): Promise<PaginatedResult<SongWithArtistAndGenres>> {
    return this.adminCatalogService.listSongs(query);
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<SongWithArtistAndGenres> {
    return this.adminCatalogService.getSong(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSongDto,
  ): Promise<SongWithArtistAndGenres> {
    return this.adminCatalogService.updateSong(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminCatalogService.deleteSong(id);
  }
}
