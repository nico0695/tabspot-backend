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

import { Logger, UnprocessableEntityException } from '@nestjs/common';

import type { ArtistRepository } from '@modules/catalog/repositories/artist.repository';
import type { GenreRepository } from '@modules/genres/repositories/genre.repository';
import type { Artist, Genre, Song } from '@src/generated/prisma/client';
import { Difficulty, Instrument, TabStatus, TabType } from '@src/generated/prisma/client';
import type { PrismaService } from '@src/prisma/prisma.service';

import { BulkImportService } from '../bulk-import.service';
import type {
  BulkImportInput,
  BulkImportSongInput,
  BulkImportVersionInput,
} from '../../dto/requests/bulk-import-request.schema';

// ── row factories ─────────────────────────────────────────────────────────

function makeArtistRow(overrides: Partial<Artist> = {}): Artist {
  return {
    id: 'artist-1',
    name: 'Almafuerte',
    slug: 'almafuerte',
    sortName: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  } as Artist;
}

function makeSongRow(overrides: Partial<Song> = {}): Song {
  return {
    id: 'song-1',
    artistId: 'artist-1',
    title: 'Cosas que pasan',
    slug: 'cosas-que-pasan',
    subtitle: null,
    releaseYear: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  } as Song;
}

function makeGenreRow(id: string): Genre {
  return {
    id,
    name: id,
    slug: id,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
  } as Genre;
}

// ── input factories ───────────────────────────────────────────────────────

function makeVersion(overrides: Partial<BulkImportVersionInput> = {}): BulkImportVersionInput {
  return {
    content: '{title: Test}\n[C]Hello',
    tabType: TabType.CHORDS,
    ...overrides,
  };
}

function makeSongInput(overrides: Partial<BulkImportSongInput> = {}): BulkImportSongInput {
  return {
    title: 'Cosas que pasan',
    versions: [makeVersion()],
    ...overrides,
  };
}

function makeInput(overrides: Partial<BulkImportInput> = {}): BulkImportInput {
  return {
    artist: { name: 'Almafuerte' },
    defaults: {
      status: TabStatus.DRAFT,
      difficulty: Difficulty.INTERMEDIATE,
      instrument: Instrument.GUITAR,
    },
    songs: [makeSongInput()],
    ...overrides,
  };
}

// ── mock harness ──────────────────────────────────────────────────────────

interface TxMock {
  $queryRaw: jest.Mock;
  song: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
  songGenre: { createMany: jest.Mock };
  tab: { aggregate: jest.Mock; findMany: jest.Mock; create: jest.Mock };
}

function makeTx(): TxMock {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{}]),
    song: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((args: { data: Partial<Song> }): Promise<Song> => {
        return Promise.resolve(makeSongRow({ id: 'song-created', ...args.data }));
      }),
      update: jest.fn().mockImplementation((args: { where: { id: string } }): Promise<Song> => {
        return Promise.resolve(makeSongRow({ id: args.where.id, deletedAt: null }));
      }),
    },
    songGenre: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
    tab: {
      aggregate: jest.fn().mockResolvedValue({ _max: { versionNumber: null } }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation(
          (args: { data: Record<string, unknown> }): Promise<Record<string, unknown>> => {
            return Promise.resolve({ id: 'tab-created', ...args.data });
          },
        ),
    },
  };
}

// Client-facing sanitized message for SONG_PERSIST_FAILED rows (4R R4-001): internal
// error text is logged server-side and never echoed back.
const SANITIZED_PERSIST_MESSAGE = 'Song import failed; details were logged server-side';

describe('BulkImportService', (): void => {
  const ADMIN_ID = 'admin-1';

  let tx: TxMock;
  // Spy held in a variable (unbound-method): silences Nest logger output and lets tests
  // assert the R4-001 diagnostic log.
  let loggerErrorSpy: jest.SpyInstance;
  let $transaction: jest.Mock;
  let artistRepo: {
    findById: jest.Mock;
    findBySlug: jest.Mock;
    create: jest.Mock;
    restore: jest.Mock;
  };
  let genreRepo: { findByIds: jest.Mock };
  let service: BulkImportService;

  function tabCreateData(call: number): Record<string, unknown> {
    const calls = tx.tab.create.mock.calls as [{ data: Record<string, unknown> }][];
    return calls[call][0].data;
  }

  beforeEach((): void => {
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((): void => undefined);
    tx = makeTx();
    $transaction = jest
      .fn()
      .mockImplementation((cb: (txClient: unknown) => Promise<unknown>): Promise<unknown> => {
        return cb(tx);
      });
    artistRepo = {
      findById: jest.fn().mockResolvedValue(null),
      findBySlug: jest.fn().mockResolvedValue(makeArtistRow()),
      create: jest.fn().mockResolvedValue(makeArtistRow({ id: 'artist-new' })),
      restore: jest.fn(),
    };
    genreRepo = { findByIds: jest.fn().mockResolvedValue([]) };
    service = new BulkImportService(
      { $transaction } as unknown as PrismaService,
      artistRepo as unknown as ArtistRepository,
      genreRepo as unknown as GenreRepository,
    );
  });

  afterEach((): void => {
    loggerErrorSpy.mockRestore();
  });

  // ── AC2.1 — artist resolution (4 paths) ───────────────────────────────

  describe('artist resolution (AC2.1)', (): void => {
    it('throws 422 ARTIST_NOT_FOUND for an unknown artist.id and performs zero writes', async (): Promise<void> => {
      artistRepo.findById.mockResolvedValue(null);
      const input = makeInput({
        artist: { id: '11111111-1111-4111-8111-111111111111', name: 'Almafuerte' },
      });

      await expect(service.bulkImport(input, ADMIN_ID)).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(service.bulkImport(input, ADMIN_ID)).rejects.toMatchObject({
        response: { code: 'ARTIST_NOT_FOUND' },
      });

      expect($transaction).not.toHaveBeenCalled();
      expect(artistRepo.create).not.toHaveBeenCalled();
      expect(artistRepo.restore).not.toHaveBeenCalled();
    });

    it('restores a soft-deleted artist referenced by explicit id without counting it as inserted', async (): Promise<void> => {
      artistRepo.findById.mockResolvedValue(
        makeArtistRow({ id: 'artist-9', deletedAt: new Date('2026-02-01') }),
      );
      artistRepo.restore.mockResolvedValue(makeArtistRow({ id: 'artist-9' }));

      const result = await service.bulkImport(
        makeInput({ artist: { id: 'artist-9', name: 'Almafuerte' } }),
        ADMIN_ID,
      );

      expect(artistRepo.restore).toHaveBeenCalledWith('artist-9');
      expect(result.inserted.artists).toBe(0);
      expect(tx.song.findFirst).toHaveBeenCalledWith({
        where: { artistId: 'artist-9', slug: 'cosas-que-pasan', includeDeleted: true },
      });
    });

    it('reuses an active artist matched by slugified name', async (): Promise<void> => {
      artistRepo.findBySlug.mockResolvedValue(makeArtistRow());

      const result = await service.bulkImport(
        makeInput({ artist: { name: 'Almafuerte!' } }),
        ADMIN_ID,
      );

      expect(artistRepo.findBySlug).toHaveBeenCalledWith('almafuerte');
      expect(artistRepo.create).not.toHaveBeenCalled();
      expect(artistRepo.restore).not.toHaveBeenCalled();
      expect(result.inserted.artists).toBe(0);
    });

    it('restores a soft-deleted artist matched by name slug without counting it as inserted', async (): Promise<void> => {
      artistRepo.findBySlug.mockResolvedValue(makeArtistRow({ deletedAt: new Date('2026-02-01') }));
      artistRepo.restore.mockResolvedValue(makeArtistRow());

      const result = await service.bulkImport(makeInput(), ADMIN_ID);

      expect(artistRepo.restore).toHaveBeenCalledWith('artist-1');
      expect(artistRepo.create).not.toHaveBeenCalled();
      expect(result.inserted.artists).toBe(0);
    });

    it('creates a missing artist with a server-side slug and counts it in inserted.artists', async (): Promise<void> => {
      artistRepo.findBySlug.mockResolvedValue(null);
      artistRepo.create.mockResolvedValue(makeArtistRow({ id: 'artist-new' }));

      const result = await service.bulkImport(
        makeInput({ artist: { name: 'Almafuerte', sortName: 'Almafuerte, Los' } }),
        ADMIN_ID,
      );

      expect(artistRepo.create).toHaveBeenCalledWith({
        name: 'Almafuerte',
        slug: 'almafuerte',
        sortName: 'Almafuerte, Los',
      });
      expect(result.inserted.artists).toBe(1);
    });
  });

  // ── AC2.2 — song statuses and counting ────────────────────────────────

  describe('song processing (AC2.2)', (): void => {
    it('creates a missing song and counts it in inserted.songs', async (): Promise<void> => {
      const result = await service.bulkImport(makeInput(), ADMIN_ID);

      expect(tx.song.create).toHaveBeenCalledWith({
        data: {
          artistId: 'artist-1',
          title: 'Cosas que pasan',
          slug: 'cosas-que-pasan',
          subtitle: null,
          releaseYear: null,
        },
      });
      expect(result.results[0]).toMatchObject({
        title: 'Cosas que pasan',
        songStatus: 'created',
        songId: 'song-created',
        tabsInserted: 1,
        tabsSkipped: 0,
      });
      expect(result.inserted.songs).toBe(1);
    });

    it('reuses an active song without modifying it and without counting it', async (): Promise<void> => {
      tx.song.findFirst.mockResolvedValue(makeSongRow());

      const result = await service.bulkImport(makeInput(), ADMIN_ID);

      expect(tx.song.create).not.toHaveBeenCalled();
      expect(tx.song.update).not.toHaveBeenCalled();
      expect(result.results[0]).toMatchObject({ songStatus: 'reused', songId: 'song-1' });
      expect(result.inserted.songs).toBe(0);
    });

    it('restores a soft-deleted song with the includeDeleted marker and reports it as reused', async (): Promise<void> => {
      tx.song.findFirst.mockResolvedValue(makeSongRow({ deletedAt: new Date('2026-02-01') }));

      const result = await service.bulkImport(makeInput(), ADMIN_ID);

      expect(tx.song.update).toHaveBeenCalledWith({
        where: { id: 'song-1', includeDeleted: true },
        data: { deletedAt: null },
      });
      expect(result.results[0]).toMatchObject({ songStatus: 'reused', songId: 'song-1' });
      expect(result.inserted.songs).toBe(0);
    });

    it('connects genres only on song create', async (): Promise<void> => {
      genreRepo.findByIds.mockResolvedValue([makeGenreRow('g1'), makeGenreRow('g2')]);

      await service.bulkImport(
        makeInput({ songs: [makeSongInput({ genreIds: ['g1', 'g2'] })] }),
        ADMIN_ID,
      );

      expect(genreRepo.findByIds).toHaveBeenCalledWith(['g1', 'g2']);
      expect(tx.songGenre.createMany).toHaveBeenCalledWith({
        data: [
          { songId: 'song-created', genreId: 'g1' },
          { songId: 'song-created', genreId: 'g2' },
        ],
      });
    });
  });

  // ── AC2.3 — version sequencing ────────────────────────────────────────

  describe('version sequencing (AC2.3)', (): void => {
    it('continues from the max versionNumber read including soft-deleted tabs', async (): Promise<void> => {
      tx.song.findFirst.mockResolvedValue(makeSongRow());
      tx.tab.aggregate.mockResolvedValue({ _max: { versionNumber: 3 } });

      await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({
              versions: [makeVersion({ content: 'v-a' }), makeVersion({ content: 'v-b' })],
            }),
          ],
        }),
        ADMIN_ID,
      );

      expect(tx.tab.aggregate).toHaveBeenCalledWith({
        _max: { versionNumber: true },
        where: { songId: 'song-1', includeDeleted: true },
      });
      expect(tabCreateData(0)['versionNumber']).toBe(4);
      expect(tabCreateData(1)['versionNumber']).toBe(5);
    });

    it('starts at 1 for a song with no tabs, bypassing the single-create hardcode', async (): Promise<void> => {
      await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({
              versions: [makeVersion({ content: 'v-a' }), makeVersion({ content: 'v-b' })],
            }),
          ],
        }),
        ADMIN_ID,
      );

      expect(tabCreateData(0)['versionNumber']).toBe(1);
      expect(tabCreateData(1)['versionNumber']).toBe(2);
    });

    it('takes the per-song advisory xact lock before reading the max version (D1)', async (): Promise<void> => {
      await service.bulkImport(makeInput(), ADMIN_ID);

      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      const [strings, ...values] = tx.$queryRaw.mock.calls[0] as [readonly string[], ...unknown[]];
      expect(strings.join('?')).toContain('pg_advisory_xact_lock(hashtext(');
      expect(values).toEqual(['song-created']);
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.tab.aggregate.mock.invocationCallOrder[0],
      );
    });
  });

  // ── AC2.4 — byte-identical content dedupe ─────────────────────────────

  describe('content dedupe (AC2.4)', (): void => {
    it('skips content identical to a persisted tab and does not advance sequencing', async (): Promise<void> => {
      tx.song.findFirst.mockResolvedValue(makeSongRow());
      tx.tab.aggregate.mockResolvedValue({ _max: { versionNumber: 5 } });
      tx.tab.findMany.mockResolvedValue([{ content: 'dup' }]);

      const result = await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({
              versions: [makeVersion({ content: 'dup' }), makeVersion({ content: 'new' })],
            }),
          ],
        }),
        ADMIN_ID,
      );

      expect(tx.tab.create).toHaveBeenCalledTimes(1);
      expect(tabCreateData(0)['content']).toBe('new');
      // The skipped version did not consume versionNumber 6.
      expect(tabCreateData(0)['versionNumber']).toBe(6);
      expect(result.results[0]).toMatchObject({ tabsInserted: 1, tabsSkipped: 1 });
      expect(result.skipped).toBe(1);
    });

    it('dedupes identical versions within the same song entry', async (): Promise<void> => {
      const result = await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({
              versions: [
                makeVersion({ content: 'x' }),
                makeVersion({ content: 'x' }),
                makeVersion({ content: 'y' }),
              ],
            }),
          ],
        }),
        ADMIN_ID,
      );

      expect(tx.tab.create).toHaveBeenCalledTimes(2);
      expect(tabCreateData(0)['content']).toBe('x');
      expect(tabCreateData(0)['versionNumber']).toBe(1);
      expect(tabCreateData(1)['content']).toBe('y');
      expect(tabCreateData(1)['versionNumber']).toBe(2);
      expect(result.results[0]).toMatchObject({ tabsInserted: 2, tabsSkipped: 1 });
    });

    it('dedupes across two batch entries resolving to the same song (Q-C)', async (): Promise<void> => {
      tx.song.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeSongRow({ id: 'song-created' }));
      tx.tab.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ content: 'shared' }]);
      tx.tab.aggregate
        .mockResolvedValueOnce({ _max: { versionNumber: null } })
        .mockResolvedValueOnce({ _max: { versionNumber: 1 } });

      const result = await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({ versions: [makeVersion({ content: 'shared' })] }),
            makeSongInput({ versions: [makeVersion({ content: 'shared' })] }),
          ],
        }),
        ADMIN_ID,
      );

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toMatchObject({
        songStatus: 'created',
        tabsInserted: 1,
        tabsSkipped: 0,
      });
      expect(result.results[1]).toMatchObject({
        songStatus: 'reused',
        tabsInserted: 0,
        tabsSkipped: 1,
      });
      expect(result.inserted).toEqual({ artists: 0, songs: 1, tabs: 1 });
      expect(result.skipped).toBe(1);
      expect(tx.tab.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── AC1.2 / AC2.5 — merge matrix and create payload ───────────────────

  describe('tab create payload (AC1.2, AC2.5)', (): void => {
    it('fills omitted instrument/difficulty/status from defaults and lets per-version values win', async (): Promise<void> => {
      await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({
              versions: [
                makeVersion({ content: 'from-defaults' }),
                makeVersion({
                  content: 'from-version',
                  instrument: Instrument.BASS,
                  difficulty: Difficulty.ADVANCED,
                  status: TabStatus.PENDING,
                  titleOverride: 'Live version',
                }),
              ],
            }),
          ],
        }),
        ADMIN_ID,
      );

      expect(tabCreateData(0)).toMatchObject({
        instrument: Instrument.GUITAR,
        difficulty: Difficulty.INTERMEDIATE,
        status: TabStatus.DRAFT,
        tabType: TabType.CHORDS,
        titleOverride: null,
      });
      expect(tabCreateData(1)).toMatchObject({
        instrument: Instrument.BASS,
        difficulty: Difficulty.ADVANCED,
        status: TabStatus.PENDING,
        titleOverride: 'Live version',
      });
    });

    it('stamps authorUserId from the admin JWT and normalizeAdminStatus metadata', async (): Promise<void> => {
      await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({
              versions: [
                makeVersion({ content: 'draft-tab' }),
                makeVersion({ content: 'published-tab', status: TabStatus.PUBLISHED }),
              ],
            }),
          ],
        }),
        ADMIN_ID,
      );

      // DRAFT (from defaults): all status metadata cleared.
      expect(tabCreateData(0)).toMatchObject({
        authorUserId: ADMIN_ID,
        status: TabStatus.DRAFT,
        submittedAt: null,
        publishedAt: null,
        moderatedByUserId: null,
        moderationNotes: null,
      });
      // PUBLISHED: timestamps set and moderatedByUserId stamped, as on single-create.
      expect(tabCreateData(1)).toMatchObject({
        authorUserId: ADMIN_ID,
        status: TabStatus.PUBLISHED,
        submittedAt: expect.any(Date) as Date,
        publishedAt: expect.any(Date) as Date,
        moderatedByUserId: ADMIN_ID,
        moderationNotes: null,
      });
    });

    it('persists content byte-for-byte verbatim', async (): Promise<void> => {
      const rawContent = '  {title: Raw}\r\n\t[C]  Hello  \n\n';

      await service.bulkImport(
        makeInput({
          songs: [makeSongInput({ versions: [makeVersion({ content: rawContent })] })],
        }),
        ADMIN_ID,
      );

      expect(tabCreateData(0)['content']).toBe(rawContent);
    });
  });

  // ── AC2.6 — reused song metadata untouched ────────────────────────────

  describe('reused song metadata (AC2.6)', (): void => {
    it('does not overwrite subtitle/releaseYear/genres of a reused song', async (): Promise<void> => {
      tx.song.findFirst.mockResolvedValue(
        makeSongRow({ subtitle: 'Original subtitle', releaseYear: 1995 }),
      );
      genreRepo.findByIds.mockResolvedValue([makeGenreRow('g1')]);

      const result = await service.bulkImport(
        makeInput({
          songs: [makeSongInput({ subtitle: 'New subtitle', releaseYear: 2001, genreIds: ['g1'] })],
        }),
        ADMIN_ID,
      );

      expect(tx.song.update).not.toHaveBeenCalled();
      expect(tx.songGenre.createMany).not.toHaveBeenCalled();
      expect(result.results[0]).toMatchObject({ songStatus: 'reused' });
    });
  });

  // ── AC1.4 — aggregation invariants ────────────────────────────────────

  describe('aggregation invariants (AC1.4)', (): void => {
    it('keeps inserted.tabs, skipped, and results/errors partition consistent on a mixed batch', async (): Promise<void> => {
      // Song A (created, 2 inserted), Song B (reused, 1 inserted + 1 skipped),
      // Song C (persist failure).
      tx.song.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeSongRow({ id: 'song-b', slug: 'song-b', title: 'Song B' }))
        .mockResolvedValueOnce(null);
      tx.song.create
        .mockResolvedValueOnce(makeSongRow({ id: 'song-a', slug: 'song-a', title: 'Song A' }))
        .mockRejectedValueOnce(new Error('insert failed'));
      tx.tab.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ content: 'dup-b' }]);

      const result = await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({
              title: 'Song A',
              versions: [makeVersion({ content: 'a-1' }), makeVersion({ content: 'a-2' })],
            }),
            makeSongInput({
              title: 'Song B',
              versions: [makeVersion({ content: 'b-new' }), makeVersion({ content: 'dup-b' })],
            }),
            makeSongInput({ title: 'Song C', versions: [makeVersion({ content: 'c-1' })] }),
          ],
        }),
        ADMIN_ID,
      );

      expect(result.results).toHaveLength(2);
      expect(result.errors).toEqual([
        {
          index: 2,
          title: 'Song C',
          code: 'SONG_PERSIST_FAILED',
          message: SANITIZED_PERSIST_MESSAGE,
        },
      ]);
      expect(result.inserted).toEqual({ artists: 0, songs: 1, tabs: 3 });
      expect(result.skipped).toBe(1);

      // Invariants: inserted.tabs = Σ tabsInserted, skipped = Σ tabsSkipped,
      // every song lands in exactly one of results[]/errors[].
      const sumInserted = result.results.reduce((sum, row): number => sum + row.tabsInserted, 0);
      const sumSkipped = result.results.reduce((sum, row): number => sum + row.tabsSkipped, 0);
      expect(result.inserted.tabs).toBe(sumInserted);
      expect(result.skipped).toBe(sumSkipped);
      expect(result.results.length + result.errors.length).toBe(3);
    });
  });

  // ── AC3.1 / AC3.2 — failure isolation and error taxonomy ──────────────

  describe('failure isolation and error taxonomy (AC3.1, AC3.2)', (): void => {
    it('isolates a mid-batch failure and continues with the remaining songs', async (): Promise<void> => {
      tx.tab.create
        .mockResolvedValueOnce({ id: 'tab-1' })
        .mockRejectedValueOnce(new Error('unique constraint violated'))
        .mockResolvedValueOnce({ id: 'tab-3' });

      const result = await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({ title: 'First', versions: [makeVersion({ content: 'f-1' })] }),
            makeSongInput({ title: 'Second', versions: [makeVersion({ content: 's-1' })] }),
            makeSongInput({ title: 'Third', versions: [makeVersion({ content: 't-1' })] }),
          ],
        }),
        ADMIN_ID,
      );

      expect($transaction).toHaveBeenCalledTimes(3);
      expect(result.results.map((row): string => row.title)).toEqual(['First', 'Third']);
      expect(result.errors).toEqual([
        {
          index: 1,
          title: 'Second',
          code: 'SONG_PERSIST_FAILED',
          message: SANITIZED_PERSIST_MESSAGE,
        },
      ]);
    });

    it('maps non-Error throws to SONG_PERSIST_FAILED with the sanitized message and logs the raw value', async (): Promise<void> => {
      tx.song.create.mockRejectedValueOnce('boom');

      const result = await service.bulkImport(makeInput(), ADMIN_ID);

      expect(result.errors).toEqual([
        {
          index: 0,
          title: 'Cosas que pasan',
          code: 'SONG_PERSIST_FAILED',
          message: SANITIZED_PERSIST_MESSAGE,
        },
      ]);
      expect(result.results).toHaveLength(0);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ index: 0, title: 'Cosas que pasan' }),
        'boom',
      );
    });

    // ── R4-001 — server-side logging + client message sanitization ──────

    it('logs the underlying error with diagnostic context on a SONG_PERSIST_FAILED path (R4-001)', async (): Promise<void> => {
      const internalError = new Error('P2002: unique constraint failed on tabs_pkey at db:5432');
      tx.tab.create.mockRejectedValueOnce(internalError);

      const result = await service.bulkImport(makeInput(), ADMIN_ID);

      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'Bulk import song failed',
          index: 0,
          title: 'Cosas que pasan',
          // Resolved before the tab insert blew up — captured for diagnostics.
          songId: 'song-created',
        }),
        expect.stringContaining('P2002: unique constraint failed on tabs_pkey at db:5432'),
      );
      // Client sees only the generic message — no internal error text leaks.
      expect(result.errors).toEqual([
        {
          index: 0,
          title: 'Cosas que pasan',
          code: 'SONG_PERSIST_FAILED',
          message: SANITIZED_PERSIST_MESSAGE,
        },
      ]);
      expect(result.errors[0].message).not.toContain('P2002');
      expect(result.errors[0].message).not.toContain('db:5432');
    });

    // ── R3-001 — genre pre-check failure stays per-song ─────────────────

    it('turns an unexpected genre lookup rejection into a per-song SONG_PERSIST_FAILED row and continues (R3-001)', async (): Promise<void> => {
      genreRepo.findByIds
        .mockRejectedValueOnce(new Error('connection reset by peer'))
        .mockResolvedValueOnce([makeGenreRow('g1')]);

      const result = await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({ title: 'Lookup blows up', genreIds: ['g1'] }),
            makeSongInput({ title: 'Clean song', genreIds: ['g1'] }),
          ],
        }),
        ADMIN_ID,
      );

      expect(result.errors).toEqual([
        {
          index: 0,
          title: 'Lookup blows up',
          code: 'SONG_PERSIST_FAILED',
          message: SANITIZED_PERSIST_MESSAGE,
        },
      ]);
      // The batch continued: the second song was fully processed.
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({ title: 'Clean song', songStatus: 'created' });
      // No transaction was opened for the song whose lookup rejected.
      expect($transaction).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ index: 0, title: 'Lookup blows up', songId: null }),
        expect.stringContaining('connection reset by peer'),
      );
    });
  });

  // ── AC3.3 — INVALID_GENRE_IDS persists nothing ────────────────────────

  describe('unknown genre ids (AC3.3)', (): void => {
    it('fails only the song with unknown genreIds, opens no transaction for it, and persists nothing', async (): Promise<void> => {
      genreRepo.findByIds.mockResolvedValue([makeGenreRow('g1')]);

      const result = await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({ title: 'Bad genres', genreIds: ['g1', 'g-missing'] }),
            makeSongInput({ title: 'Clean song' }),
          ],
        }),
        ADMIN_ID,
      );

      expect(result.errors).toEqual([
        {
          index: 0,
          title: 'Bad genres',
          code: 'INVALID_GENRE_IDS',
          message: 'One or more genre IDs are invalid',
        },
      ]);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({ title: 'Clean song', songStatus: 'created' });
      // Only the clean song opened a transaction — nothing persisted for the failed one.
      expect($transaction).toHaveBeenCalledTimes(1);
      expect(tx.song.create).toHaveBeenCalledTimes(1);
      expect(tx.songGenre.createMany).not.toHaveBeenCalled();
    });
  });

  // ── AC3.4 — full replay idempotency ───────────────────────────────────

  describe('full replay idempotency (AC3.4)', (): void => {
    it('replaying a fully committed batch yields zero inserts, all reused, all skipped', async (): Promise<void> => {
      artistRepo.findBySlug.mockResolvedValue(makeArtistRow());
      tx.song.findFirst
        .mockResolvedValueOnce(makeSongRow({ id: 'song-a', slug: 'song-a', title: 'Song A' }))
        .mockResolvedValueOnce(makeSongRow({ id: 'song-b', slug: 'song-b', title: 'Song B' }));
      tx.tab.aggregate.mockResolvedValue({ _max: { versionNumber: 2 } });
      tx.tab.findMany
        .mockResolvedValueOnce([{ content: 'a-1' }, { content: 'a-2' }])
        .mockResolvedValueOnce([{ content: 'b-1' }, { content: 'b-2' }]);

      const result = await service.bulkImport(
        makeInput({
          songs: [
            makeSongInput({
              title: 'Song A',
              versions: [makeVersion({ content: 'a-1' }), makeVersion({ content: 'a-2' })],
            }),
            makeSongInput({
              title: 'Song B',
              versions: [makeVersion({ content: 'b-1' }), makeVersion({ content: 'b-2' })],
            }),
          ],
        }),
        ADMIN_ID,
      );

      expect(result.inserted).toEqual({ artists: 0, songs: 0, tabs: 0 });
      expect(result.skipped).toBe(4);
      expect(result.errors).toEqual([]);
      expect(result.results).toEqual([
        expect.objectContaining({ songStatus: 'reused', tabsInserted: 0, tabsSkipped: 2 }),
        expect.objectContaining({ songStatus: 'reused', tabsInserted: 0, tabsSkipped: 2 }),
      ]);
      expect(tx.tab.create).not.toHaveBeenCalled();
      expect(tx.song.create).not.toHaveBeenCalled();
      expect(artistRepo.create).not.toHaveBeenCalled();
    });
  });
});
