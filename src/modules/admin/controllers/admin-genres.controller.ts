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
import type { Genre } from '@src/generated/prisma/client';
import { UserRole } from '@src/generated/prisma/client';

import { CreateGenreDto } from '../dto/create-genre.dto';
import { ListAdminGenresDto } from '../dto/list-admin-genres.dto';
import { UpdateGenreDto } from '../dto/update-genre.dto';
import { AdminGenreResponseDto, AdminPaginatedGenresDto } from '../dto/responses';
import type { PaginatedResult } from '../services/admin-catalog.service';
import { AdminCatalogService } from '../services/admin-catalog.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/genres', version: '1' })
export class AdminGenresController {
  constructor(private readonly adminCatalogService: AdminCatalogService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'Genre created', type: AdminGenreResponseDto })
  @ApiConflictResponse({ description: 'Genre slug already exists', type: ErrorResponseDto })
  @ApiAdminErrors()
  async create(@Body() body: CreateGenreDto): Promise<Genre> {
    return this.adminCatalogService.createGenre(body);
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated list of genres', type: AdminPaginatedGenresDto })
  @ApiAdminErrors()
  async list(@Query() query: ListAdminGenresDto): Promise<PaginatedResult<Genre>> {
    return this.adminCatalogService.listGenres(query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Genre details', type: AdminGenreResponseDto })
  @ApiNotFoundResponse({ description: 'Genre not found', type: ErrorResponseDto })
  @ApiAdminErrors()
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<Genre> {
    return this.adminCatalogService.getGenre(id);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Genre updated', type: AdminGenreResponseDto })
  @ApiNotFoundResponse({ description: 'Genre not found', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Genre slug already exists', type: ErrorResponseDto })
  @ApiAdminErrors()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateGenreDto,
  ): Promise<Genre> {
    return this.adminCatalogService.updateGenre(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Genre soft-deleted' })
  @ApiNotFoundResponse({ description: 'Genre not found', type: ErrorResponseDto })
  @ApiConflictResponse({
    description: 'Genre has active song associations',
    type: ErrorResponseDto,
  })
  @ApiAdminErrors()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminCatalogService.deleteGenre(id);
  }
}
