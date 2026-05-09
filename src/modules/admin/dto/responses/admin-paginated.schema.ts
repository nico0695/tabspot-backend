import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

import { AdminArtistResponseSchema } from './admin-artist-response.schema';
import { AdminGenreResponseSchema } from './admin-genre-response.schema';
import { AdminSongResponseSchema } from './admin-song-response.schema';
import { AdminTabWithAuthorResponseSchema } from './admin-tab-response.schema';
import { AdminUserResponseSchema } from './admin-user-response.schema';

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
  data: z.array(AdminTabWithAuthorResponseSchema),
  pageInfo: OffsetPageInfoSchema,
});
export class AdminPaginatedTabsDto extends createZodDto(AdminPaginatedTabsSchema) {}

export const AdminPaginatedUsersSchema = z.object({
  data: z.array(AdminUserResponseSchema),
  pageInfo: OffsetPageInfoSchema,
});
export class AdminPaginatedUsersDto extends createZodDto(AdminPaginatedUsersSchema) {}
