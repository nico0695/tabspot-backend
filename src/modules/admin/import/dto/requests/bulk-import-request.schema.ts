import { z } from 'zod';

import { Difficulty, Instrument, TabStatus, TabType } from '@src/generated/prisma/client';

export const BulkImportArtistSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  sortName: z.string().trim().min(1).max(200).optional(),
});

export const BulkImportDefaultsSchema = z.object({
  status: z.nativeEnum(TabStatus),
  difficulty: z.nativeEnum(Difficulty),
  instrument: z.nativeEnum(Instrument),
});

export const BulkImportVersionSchema = z.object({
  content: z.string().min(1).max(102_400),
  tabType: z.nativeEnum(TabType),
  instrument: z.nativeEnum(Instrument).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  status: z.nativeEnum(TabStatus).optional(),
  titleOverride: z.string().trim().min(1).max(200).nullable().optional(),
});

export const BulkImportSongSchema = z.object({
  title: z.string().trim().min(1).max(300),
  subtitle: z.string().trim().min(1).max(300).nullable().optional(),
  releaseYear: z.number().int().min(1900).max(2100).nullable().optional(),
  genreIds: z.array(z.string().uuid()).max(10).optional(),
  versions: z.array(BulkImportVersionSchema).min(1).max(20),
});

export const BulkImportRequestSchema = z.object({
  artist: BulkImportArtistSchema,
  defaults: BulkImportDefaultsSchema,
  songs: z.array(BulkImportSongSchema).min(1).max(100),
});

export type BulkImportArtistInput = z.infer<typeof BulkImportArtistSchema>;
export type BulkImportDefaultsInput = z.infer<typeof BulkImportDefaultsSchema>;
export type BulkImportVersionInput = z.infer<typeof BulkImportVersionSchema>;
export type BulkImportSongInput = z.infer<typeof BulkImportSongSchema>;
export type BulkImportInput = z.infer<typeof BulkImportRequestSchema>;
