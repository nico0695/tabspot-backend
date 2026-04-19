import type { Song } from '@src/generated/prisma/client';

const DEFAULT_SONG: Song = {
  id: '00000000-0000-0000-0000-000000000201',
  artistId: '00000000-0000-0000-0000-000000000101',
  title: 'Hey Jude',
  slug: 'hey-jude',
  subtitle: null,
  releaseYear: 1968,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

export function makeSong(overrides?: Partial<Song>): Song {
  return { ...DEFAULT_SONG, ...overrides };
}
