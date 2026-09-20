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

import { Difficulty, Instrument, TabStatus, TabType } from '@src/generated/prisma/client';

import { BulkImportRequestSchema } from '../bulk-import-request.schema';

type PlainVersion = Record<string, unknown>;
type PlainSong = Record<string, unknown>;

function makeVersion(overrides: PlainVersion = {}): PlainVersion {
  return {
    content: '{title: Test}\n[C]Hello',
    tabType: TabType.CHORDS,
    ...overrides,
  };
}

function makeSong(overrides: PlainSong = {}): PlainSong {
  return {
    title: 'Cosas que pasan',
    versions: [makeVersion()],
    ...overrides,
  };
}

function makePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    artist: { name: 'Almafuerte' },
    defaults: {
      status: TabStatus.DRAFT,
      difficulty: Difficulty.INTERMEDIATE,
      instrument: Instrument.GUITAR,
    },
    songs: [makeSong()],
    ...overrides,
  };
}

describe('BulkImportRequestSchema', (): void => {
  // ── happy path ──────────────────────────────────────────────────────────

  describe('happy path', (): void => {
    it('parses a minimal payload where versions omit the defaults-merge fields', (): void => {
      const result = BulkImportRequestSchema.safeParse(makePayload());

      expect(result.success).toBe(true);
      if (result.success) {
        const version = result.data.songs[0].versions[0];
        expect(version.instrument).toBeUndefined();
        expect(version.difficulty).toBeUndefined();
        expect(version.status).toBeUndefined();
        expect(version.content).toBe('{title: Test}\n[C]Hello');
        expect(version.tabType).toBe(TabType.CHORDS);
      }
    });

    it('parses a full payload with per-version overrides and song metadata', (): void => {
      const payload = makePayload({
        artist: {
          id: 'b3b0c4e2-1111-4222-8333-444455556666',
          name: 'Almafuerte',
          sortName: 'Almafuerte',
        },
        songs: [
          makeSong({
            subtitle: null,
            releaseYear: 1998,
            genreIds: ['b3b0c4e2-1111-4222-8333-444455556667'],
            versions: [
              makeVersion({
                instrument: Instrument.BASS,
                difficulty: Difficulty.ADVANCED,
                status: TabStatus.PUBLISHED,
                titleOverride: 'Alt title',
              }),
            ],
          }),
        ],
      });

      const result = BulkImportRequestSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        const version = result.data.songs[0].versions[0];
        expect(version.instrument).toBe(Instrument.BASS);
        expect(version.difficulty).toBe(Difficulty.ADVANCED);
        expect(version.status).toBe(TabStatus.PUBLISHED);
        expect(version.titleOverride).toBe('Alt title');
        expect(result.data.songs[0].releaseYear).toBe(1998);
      }
    });
  });

  // ── AC1.3 — Q-D caps reject ─────────────────────────────────────────────

  describe('Q-D caps (AC1.3)', (): void => {
    it('rejects more than 100 songs', (): void => {
      const songs = Array.from({ length: 101 }, (): PlainSong => makeSong());

      expect(BulkImportRequestSchema.safeParse(makePayload({ songs })).success).toBe(false);
    });

    it('rejects a song with more than 20 versions', (): void => {
      const versions = Array.from({ length: 21 }, (): PlainVersion => makeVersion());

      expect(
        BulkImportRequestSchema.safeParse(makePayload({ songs: [makeSong({ versions })] })).success,
      ).toBe(false);
    });

    it('rejects content longer than 102,400 characters and accepts the exact cap', (): void => {
      const atCap = makeVersion({ content: 'a'.repeat(102_400) });
      const overCap = makeVersion({ content: 'a'.repeat(102_401) });

      expect(
        BulkImportRequestSchema.safeParse(makePayload({ songs: [makeSong({ versions: [atCap] })] }))
          .success,
      ).toBe(true);
      expect(
        BulkImportRequestSchema.safeParse(
          makePayload({ songs: [makeSong({ versions: [overCap] })] }),
        ).success,
      ).toBe(false);
    });

    it('rejects empty songs[] and empty versions[] (min 1)', (): void => {
      expect(BulkImportRequestSchema.safeParse(makePayload({ songs: [] })).success).toBe(false);
      expect(
        BulkImportRequestSchema.safeParse(makePayload({ songs: [makeSong({ versions: [] })] }))
          .success,
      ).toBe(false);
    });

    it('rejects more than 10 genreIds', (): void => {
      const genreIds = Array.from(
        { length: 11 },
        (_v, i): string => `b3b0c4e2-1111-4222-8333-4444555566${String(i).padStart(2, '0')}`,
      );

      expect(
        BulkImportRequestSchema.safeParse(makePayload({ songs: [makeSong({ genreIds })] })).success,
      ).toBe(false);
    });
  });

  // ── required fields ─────────────────────────────────────────────────────

  describe('required fields', (): void => {
    it('rejects a missing defaults object and missing defaults keys', (): void => {
      const noDefaults = makePayload();
      delete noDefaults.defaults;

      expect(BulkImportRequestSchema.safeParse(noDefaults).success).toBe(false);
      expect(
        BulkImportRequestSchema.safeParse(
          makePayload({ defaults: { status: TabStatus.DRAFT, difficulty: Difficulty.BEGINNER } }),
        ).success,
      ).toBe(false);
    });

    it('rejects a version without tabType (no default exists for it)', (): void => {
      const version = makeVersion();
      delete version.tabType;

      expect(
        BulkImportRequestSchema.safeParse(
          makePayload({ songs: [makeSong({ versions: [version] })] }),
        ).success,
      ).toBe(false);
    });

    it('rejects a non-uuid artist.id and an empty artist name', (): void => {
      expect(
        BulkImportRequestSchema.safeParse(
          makePayload({ artist: { id: 'not-a-uuid', name: 'Almafuerte' } }),
        ).success,
      ).toBe(false);
      expect(
        BulkImportRequestSchema.safeParse(makePayload({ artist: { name: '   ' } })).success,
      ).toBe(false);
    });
  });

  // ── AC1.5 — versionNumber never honored ─────────────────────────────────

  describe('versionNumber handling (AC1.5)', (): void => {
    it('strips an unknown versionNumber key from version objects', (): void => {
      const payload = makePayload({
        songs: [makeSong({ versions: [makeVersion({ versionNumber: 99 })] })],
      });

      const result = BulkImportRequestSchema.safeParse(payload);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.songs[0].versions[0]).not.toHaveProperty('versionNumber');
      }
    });
  });
});
