import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

import { AdminArtistResponseSchema } from '../../../catalog-management/artists/dto/responses/admin-artist-response.schema';
import { AdminGenreResponseSchema } from '../../../catalog-management/genres/dto/responses/admin-genre-response.schema';
import { AdminSongResponseSchema } from '../../../catalog-management/songs/dto/responses/admin-song-response.schema';
import { AdminTabWithRelationsResponseSchema } from '../../../tabs/dto/responses/admin-tab-response.schema';
import { AdminUserResponseSchema } from '../../../users/dto/responses/admin-user-response.schema';

const OffsetPageInfoSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
  totalPages: z.number().int(),
});

export const AdminPaginatedArtistsSchema = z.object({
  data: z.array(AdminArtistResponseSchema),
  pageInfo: OffsetPageInfoSchema,
});
export class AdminPaginatedArtistsDto extends createZodDto(AdminPaginatedArtistsSchema) {}

export const AdminPaginatedGenresSchema = z.object({
  data: z.array(AdminGenreResponseSchema),
  pageInfo: OffsetPageInfoSchema,
});
export class AdminPaginatedGenresDto extends createZodDto(AdminPaginatedGenresSchema) {}

export const AdminPaginatedSongsSchema = z.object({
  data: z.array(AdminSongResponseSchema),
  pageInfo: OffsetPageInfoSchema,
});
export class AdminPaginatedSongsDto extends createZodDto(AdminPaginatedSongsSchema) {}

export const AdminPaginatedTabsSchema = z.object({
  data: z.array(AdminTabWithRelationsResponseSchema),
  pageInfo: OffsetPageInfoSchema,
});
export class AdminPaginatedTabsDto extends createZodDto(AdminPaginatedTabsSchema) {}

export const AdminPaginatedUsersSchema = z.object({
  data: z.array(AdminUserResponseSchema),
  pageInfo: OffsetPageInfoSchema,
});
export class AdminPaginatedUsersDto extends createZodDto(AdminPaginatedUsersSchema) {}
