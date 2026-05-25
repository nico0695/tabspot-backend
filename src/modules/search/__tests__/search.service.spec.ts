jest.mock(
  '@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
    return require('@prisma/client/runtime/query_compiler_fast_bg.postgresql.js');
  },
  { virtual: true },
);
jest.mock(
  '@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
    return require('@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.js');
  },
  { virtual: true },
);

import type { PrismaService } from '@src/prisma/prisma.service';

import { SearchService } from '../search.service';

// ── Mock PrismaService ────────────────────────────────────────────────────

interface MockPrisma {
  artist: { findMany: jest.Mock };
  song: { findMany: jest.Mock };
  tab: { findMany: jest.Mock };
}

function makeMockPrisma(): MockPrisma {
  return {
    artist: { findMany: jest.fn() },
    song: { findMany: jest.fn() },
    tab: { findMany: jest.fn() },
  };
}

// ── Test suite ────────────────────────────────────────────────────────────

describe('SearchService', (): void => {
  let service: SearchService;
  let prisma: MockPrisma;

  beforeEach((): void => {
    prisma = makeMockPrisma();
    service = new SearchService(prisma as unknown as PrismaService);
  });

  it('returns matching artists, songs, and tabs', async (): Promise<void> => {
    prisma.artist.findMany.mockResolvedValue([
      { id: 'a1', name: 'Led Zeppelin', slug: 'led-zeppelin' },
    ]);
    prisma.song.findMany.mockResolvedValue([
      {
        id: 's1',
        title: 'Stairway to Heaven',
        slug: 'stairway-to-heaven',
        artist: { id: 'a1', name: 'Led Zeppelin', slug: 'led-zeppelin' },
      },
    ]);
    prisma.tab.findMany.mockResolvedValue([
      {
        id: 't1',
        tabType: 'CHORDS',
        instrument: 'GUITAR',
        difficulty: 'BEGINNER',
        song: { title: 'Stairway to Heaven' },
        author: { displayName: 'JohnDoe' },
      },
    ]);

    const result = await service.search({ q: 'led', limit: 5 });

    expect(result.artists).toHaveLength(1);
    expect(result.artists[0]).toEqual({
      id: 'a1',
      name: 'Led Zeppelin',
      slug: 'led-zeppelin',
    });
    expect(result.songs).toHaveLength(1);
    expect(result.songs[0]).toEqual({
      id: 's1',
      title: 'Stairway to Heaven',
      slug: 'stairway-to-heaven',
      artist: { id: 'a1', name: 'Led Zeppelin', slug: 'led-zeppelin' },
    });
    expect(result.tabs).toHaveLength(1);
    expect(result.tabs[0]).toEqual({
      id: 't1',
      songTitle: 'Stairway to Heaven',
      tabType: 'CHORDS',
      instrument: 'GUITAR',
      difficulty: 'BEGINNER',
      authorDisplayName: 'JohnDoe',
    });
  });

  it('returns empty arrays when no matches', async (): Promise<void> => {
    prisma.artist.findMany.mockResolvedValue([]);
    prisma.song.findMany.mockResolvedValue([]);
    prisma.tab.findMany.mockResolvedValue([]);

    const result = await service.search({ q: 'xyznonexistent', limit: 5 });

    expect(result.artists).toEqual([]);
    expect(result.songs).toEqual([]);
    expect(result.tabs).toEqual([]);
  });

  it('respects limit parameter', async (): Promise<void> => {
    prisma.artist.findMany.mockResolvedValue([]);
    prisma.song.findMany.mockResolvedValue([]);
    prisma.tab.findMany.mockResolvedValue([]);

    await service.search({ q: 'test', limit: 10 });

    expect(prisma.artist.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
    expect(prisma.song.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
    expect(prisma.tab.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
  });

  it('filters tabs by PUBLISHED status', async (): Promise<void> => {
    prisma.artist.findMany.mockResolvedValue([]);
    prisma.song.findMany.mockResolvedValue([]);
    prisma.tab.findMany.mockResolvedValue([]);

    await service.search({ q: 'test', limit: 5 });

    expect(prisma.tab.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: expect.objectContaining({
          status: 'PUBLISHED',
          deletedAt: null,
        }),
      }),
    );
  });

  it('searches categories independently — one can return results while others are empty', async (): Promise<void> => {
    prisma.artist.findMany.mockResolvedValue([{ id: 'a1', name: 'Metallica', slug: 'metallica' }]);
    prisma.song.findMany.mockResolvedValue([]);
    prisma.tab.findMany.mockResolvedValue([]);

    const result = await service.search({ q: 'meta', limit: 5 });

    expect(result.artists).toHaveLength(1);
    expect(result.songs).toEqual([]);
    expect(result.tabs).toEqual([]);
  });
});
