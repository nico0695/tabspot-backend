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
import type { Artist } from '@src/generated/prisma/client';
import { UserRole } from '@src/generated/prisma/client';

import { CreateArtistDto } from '../dto/create-artist.dto';
import { ListAdminArtistsDto } from '../dto/list-admin-artists.dto';
import { UpdateArtistDto } from '../dto/update-artist.dto';
import { AdminArtistResponseDto, AdminPaginatedArtistsDto } from '../dto/responses';
import type { PaginatedResult } from '../services/admin-catalog.service';
import { AdminCatalogService } from '../services/admin-catalog.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/artists', version: '1' })
export class AdminArtistsController {
  constructor(private readonly adminCatalogService: AdminCatalogService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Artist created', type: AdminArtistResponseDto })
  @ApiConflictResponse({ description: 'Artist slug already exists', type: ErrorResponseDto })
  @ApiAdminErrors()
  async create(@Body() body: CreateArtistDto): Promise<Artist> {
    return this.adminCatalogService.createArtist(body);
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated list of artists', type: AdminPaginatedArtistsDto })
  @ApiAdminErrors()
  async list(@Query() query: ListAdminArtistsDto): Promise<PaginatedResult<Artist>> {
    return this.adminCatalogService.listArtists(query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Artist details', type: AdminArtistResponseDto })
  @ApiNotFoundResponse({ description: 'Artist not found', type: ErrorResponseDto })
  @ApiAdminErrors()
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<Artist> {
    return this.adminCatalogService.getArtist(id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Artist updated', type: AdminArtistResponseDto })
  @ApiNotFoundResponse({ description: 'Artist not found', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Artist slug already exists', type: ErrorResponseDto })
  @ApiAdminErrors()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateArtistDto,
  ): Promise<Artist> {
    return this.adminCatalogService.updateArtist(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Artist soft-deleted' })
  @ApiNotFoundResponse({ description: 'Artist not found', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Artist has active songs', type: ErrorResponseDto })
  @ApiAdminErrors()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminCatalogService.deleteArtist(id);
  }
}
