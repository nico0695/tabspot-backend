import type { Artist } from '@src/generated/prisma/client';

const DEFAULT_ARTIST: Artist = {
  id: '00000000-0000-0000-0000-000000000101',
  name: 'The Beatles',
  slug: 'the-beatles',
  sortName: 'Beatles, The',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

export function makeArtist(overrides?: Partial<Artist>): Artist {
  return { ...DEFAULT_ARTIST, ...overrides };
}
