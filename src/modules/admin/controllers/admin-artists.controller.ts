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
import type { Artist } from '@src/generated/prisma/client';
import { UserRole } from '@src/generated/prisma/client';

import { CreateArtistDto } from '../dto/create-artist.dto';
import { ListAdminArtistsDto } from '../dto/list-admin-artists.dto';
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
  async create(@Body() body: CreateArtistDto): Promise<Artist> {
    return this.adminCatalogService.createArtist(body);
  }

  @Get()
  async list(@Query() query: ListAdminArtistsDto): Promise<PaginatedResult<Artist>> {
    return this.adminCatalogService.listArtists(query);
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<Artist> {
    return this.adminCatalogService.getArtist(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateArtistDto,
  ): Promise<Artist> {
    return this.adminCatalogService.updateArtist(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminCatalogService.deleteArtist(id);
  }
}
