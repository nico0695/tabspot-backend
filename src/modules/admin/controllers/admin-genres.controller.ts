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
import type { Genre } from '@src/generated/prisma/client';
import { UserRole } from '@src/generated/prisma/client';

import {
  adminGenreResponseExample,
  genreHasSongsExample,
  genreNotFoundExample,
  genreSlugConflictExample,
  listAdminGenresResponseExample,
} from '../dto/admin-openapi.examples';
import { AdminGenreResponseDto } from '../dto/admin-genre-response.dto';
import { CreateGenreDto } from '../dto/create-genre.dto';
import { ListAdminGenresDto } from '../dto/list-admin-genres.dto';
import { ListAdminGenresResponseDto } from '../dto/list-admin-genres-response.dto';
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
  @ApiCreatedResponse({
    description: 'Genre created',
    type: AdminGenreResponseDto,
    example: adminGenreResponseExample,
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiValidationErrorResponse()
  @ApiConflictErrorResponse({ example: genreSlugConflictExample })
  async create(@Body() body: CreateGenreDto): Promise<Genre> {
    return this.adminCatalogService.createGenre(body);
  }

  @Get()
  @ApiOkResponse({
    description: 'Paginated list of genres (admin)',
    type: ListAdminGenresResponseDto,
    example: listAdminGenresResponseExample,
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiValidationErrorResponse()
  async list(@Query() query: ListAdminGenresDto): Promise<PaginatedResult<Genre>> {
    return this.adminCatalogService.listGenres(query);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Genre detail (admin)',
    type: AdminGenreResponseDto,
    example: adminGenreResponseExample,
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiBadRequestErrorResponse()
  @ApiNotFoundErrorResponse({ example: genreNotFoundExample })
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<Genre> {
    return this.adminCatalogService.getGenre(id);
  }

  @Patch(':id')
  @ApiOkResponse({
    description: 'Genre updated',
    type: AdminGenreResponseDto,
    example: { ...adminGenreResponseExample, name: 'Jazz', slug: 'jazz' },
  })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiBadRequestErrorResponse()
  @ApiValidationErrorResponse()
  @ApiNotFoundErrorResponse({ example: genreNotFoundExample })
  @ApiConflictErrorResponse({ example: genreSlugConflictExample })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateGenreDto,
  ): Promise<Genre> {
    return this.adminCatalogService.updateGenre(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Genre soft-deleted' })
  @ApiUnauthorizedErrorResponse({ example: unauthorizedExample })
  @ApiForbiddenErrorResponse()
  @ApiBadRequestErrorResponse()
  @ApiNotFoundErrorResponse({ example: genreNotFoundExample })
  @ApiConflictErrorResponse({ example: genreHasSongsExample })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.adminCatalogService.deleteGenre(id);
  }
}
