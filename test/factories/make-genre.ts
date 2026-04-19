import type { Genre } from '@src/generated/prisma/client';

const DEFAULT_GENRE: Genre = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Rock',
  slug: 'rock',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  deletedAt: null,
};

export function makeGenre(overrides?: Partial<Genre>): Genre {
  return { ...DEFAULT_GENRE, ...overrides };
}
