import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const BulkImportSongResultSchema = z.object({
  title: z.string(),
  songStatus: z.enum(['created', 'reused']),
  songId: z.string().uuid(),
  tabsInserted: z.number().int(),
  tabsSkipped: z.number().int(),
});

export const BulkImportSongErrorSchema = z.object({
  index: z.number().int(),
  title: z.string(),
  code: z.enum(['INVALID_GENRE_IDS', 'SONG_PERSIST_FAILED']),
  message: z.string(),
});

export const BulkImportResponseSchema = z.object({
  inserted: z.object({
    artists: z.number().int(),
    songs: z.number().int(),
    tabs: z.number().int(),
  }),
  skipped: z.number().int(),
  results: z.array(BulkImportSongResultSchema),
  errors: z.array(BulkImportSongErrorSchema),
});

export type BulkImportSongResult = z.infer<typeof BulkImportSongResultSchema>;
export type BulkImportSongError = z.infer<typeof BulkImportSongErrorSchema>;
export type BulkImportResponse = z.infer<typeof BulkImportResponseSchema>;

export class BulkImportResponseDto extends createZodDto(BulkImportResponseSchema) {}
