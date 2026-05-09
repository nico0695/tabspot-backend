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
import type { Genre } from '@src/generated/prisma/client';
import { UserRole } from '@src/generated/prisma/client';

import { CreateGenreDto } from '../dto/create-genre.dto';
import { ListAdminGenresDto } from '../dto/list-admin-genres.dto';
import { UpdateGenreDto } from '../dto/update-genre.dto';
import type { PaginatedResult } from '../services/admin-catalog.service';
import { AdminCatalogService } from '../services/admin-catalog.service';

@ApiTags('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/genres', version: '1' })
export class AdminGenresController {
  constructor(private readonly adminCatalogService: AdminCatalogService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateGenreDto): Promise<Genre> {
    return this.adminCatalogService.createGenre(body);
  }

  @Get()
  async list(@Query() query: ListAdminGenresDto): Promise<PaginatedResult<Genre>> {
    return this.adminCatalogService.listGenres(query);
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<Genre> {
    return this.adminCatalogService.getGenre(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateGenreDto,
  ): Promise<Genre> {
    return this.adminCatalogService.updateGenre(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminCatalogService.deleteGenre(id);
  }
}
