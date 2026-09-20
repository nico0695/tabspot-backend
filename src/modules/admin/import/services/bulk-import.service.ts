import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';

import { slugify } from '@common/utils/slugify';
import { normalizeAdminStatus } from '@modules/tabs/domain/normalize-admin-status';
import { ArtistRepository } from '@modules/catalog/repositories/artist.repository';
import { GenreRepository } from '@modules/genres/repositories/genre.repository';
import type { Artist, Prisma, Song } from '@src/generated/prisma/client';
import { PrismaService } from '@src/prisma/prisma.service';

import type {
  BulkImportArtistInput,
  BulkImportDefaultsInput,
  BulkImportInput,
  BulkImportSongInput,
} from '../dto/requests/bulk-import-request.schema';
import type {
  BulkImportResponse,
  BulkImportSongResult,
} from '../dto/responses/bulk-import-response.schema';

/**
 * Mutable per-song diagnostic capture: `importSong` records the resolved song id here so
 * the per-song catch can log it even after the transaction has rolled back.
 */
interface SongDiagnostics {
  songId?: string;
}

/**
 * Bulk import orchestration (design D4): resolves the artist once per request, then runs
 * one interactive `$transaction` per song (advisory xact lock, max+1 version sequencing
 * including soft-deleted tabs, byte-identical content dedupe, per-song failure isolation).
 */
@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly artistRepository: ArtistRepository,
    private readonly genreRepository: GenreRepository,
  ) {}

  async bulkImport(input: BulkImportInput, adminUserId: string): Promise<BulkImportResponse> {
    // Artist is resolved exactly once, before any song processing (spec Part 2).
    const { artist, created: artistCreated } = await this.resolveArtist(input.artist);

    const response: BulkImportResponse = {
      inserted: { artists: artistCreated ? 1 : 0, songs: 0, tabs: 0 },
      skipped: 0,
      results: [],
      errors: [],
    };

    // Sequential, in songs[] array order — one interactive transaction per song (D4/D5).
    for (let index = 0; index < input.songs.length; index += 1) {
      const song = input.songs[index];
      const diagnostics: SongDiagnostics = {};

      try {
        // Genre pre-check before the transaction (D4): unknown ids fail only this song
        // and persist nothing — no transaction is even opened. It sits inside the try
        // (4R R3-001) so an unexpected findByIds rejection becomes this song's
        // SONG_PERSIST_FAILED row instead of aborting the whole batch mid-flight.
        const genreIds = song.genreIds ?? [];
        if (genreIds.length > 0) {
          const foundGenres = await this.genreRepository.findByIds(genreIds);
          if (foundGenres.length !== genreIds.length) {
            response.errors.push({
              index,
              title: song.title,
              code: 'INVALID_GENRE_IDS',
              message: 'One or more genre IDs are invalid',
            });
            continue;
          }
        }

        const result = await this.prisma.$transaction(async (tx) =>
          this.importSong(tx, artist.id, song, input.defaults, adminUserId, diagnostics),
        );

        response.results.push(result);
        if (result.songStatus === 'created') {
          response.inserted.songs += 1;
        }
        response.inserted.tabs += result.tabsInserted;
        response.skipped += result.tabsSkipped;
      } catch (error) {
        // Per-song failure isolation (spec Part 3): the transaction rolled back — log the
        // full diagnostic context server-side (4R R4-001), then record a sanitized error
        // row and continue with the next song. Raw Prisma/driver messages must never
        // reach the client response.
        this.logger.error(
          {
            msg: 'Bulk import song failed',
            index,
            title: song.title,
            songId: diagnostics.songId ?? null,
          },
          error instanceof Error ? error.stack : String(error),
        );
        response.errors.push({
          index,
          title: song.title,
          code: 'SONG_PERSIST_FAILED',
          message: 'Song import failed; details were logged server-side',
        });
      }
    }

    return response;
  }

  /**
   * Artist resolution (spec Part 2, AC2.1):
   * - explicit id → must exist (incl. soft-deleted) or batch-level 422 ARTIST_NOT_FOUND;
   *   soft-deleted → restore and reuse.
   * - no id → find by slugified name incl. soft-deleted: reuse / restore / create.
   * Restored or reused artists never count in `inserted.artists`.
   */
  private async resolveArtist(
    input: BulkImportArtistInput,
  ): Promise<{ artist: Artist; created: boolean }> {
    if (input.id !== undefined) {
      // Repository finder already passes includeDeleted (design D3).
      const existing = await this.artistRepository.findById(input.id);

      if (!existing) {
        throw new UnprocessableEntityException({
          code: 'ARTIST_NOT_FOUND',
          message: 'Artist not found',
        });
      }

      if (existing.deletedAt !== null) {
        return { artist: await this.artistRepository.restore(existing.id), created: false };
      }

      return { artist: existing, created: false };
    }

    const slug = slugify(input.name);
    const bySlug = await this.artistRepository.findBySlug(slug);

    if (bySlug) {
      if (bySlug.deletedAt !== null) {
        return { artist: await this.artistRepository.restore(bySlug.id), created: false };
      }
      return { artist: bySlug, created: false };
    }

    const created = await this.artistRepository.create({
      name: input.name,
      slug,
      sortName: input.sortName ?? null,
    });

    return { artist: created, created: true };
  }

  /**
   * One song inside its own interactive transaction: find-or-create/restore the song by
   * `(artistId, slug)`, take the per-song advisory xact lock (D1), sequence versions from
   * the max versionNumber including soft-deleted tabs, and insert non-duplicate contents.
   */
  private async importSong(
    tx: Prisma.TransactionClient,
    artistId: string,
    song: BulkImportSongInput,
    defaults: BulkImportDefaultsInput,
    adminUserId: string,
    diagnostics: SongDiagnostics,
  ): Promise<BulkImportSongResult> {
    const slug = slugify(song.title);

    // Find-or-create song by (artistId, slug), including soft-deleted rows (Q5/Q6).
    const existing = await tx.song.findFirst({
      where: { artistId, slug, includeDeleted: true } as never,
    });

    let songRow: Song;
    let songCreated = false;

    if (existing) {
      if (existing.deletedAt !== null) {
        // includeDeleted is load-bearing (D3 gotcha): the soft-delete extension also
        // filters update operations, so without the marker this restore never matches.
        songRow = await tx.song.update({
          where: { id: existing.id, includeDeleted: true } as never,
          data: { deletedAt: null },
        });
      } else {
        songRow = existing;
      }
      // Reused songs keep their metadata — no overwrite of subtitle/releaseYear/genres
      // (AC2.6); reuse appends versions only.
    } else {
      songRow = await tx.song.create({
        data: {
          artistId,
          title: song.title,
          slug,
          subtitle: song.subtitle ?? null,
          releaseYear: song.releaseYear ?? null,
        },
      });
      songCreated = true;

      // Genres are connected only on create (spec Part 2, step 2).
      const genreIds = song.genreIds ?? [];
      if (genreIds.length > 0) {
        await tx.songGenre.createMany({
          data: genreIds.map((genreId: string) => ({ songId: songRow.id, genreId })),
        });
      }
    }

    // Captured for the catch-side diagnostic log (R4-001) — meaningful even when the
    // transaction later rolls back.
    diagnostics.songId = songRow.id;

    // D1: per-song advisory xact lock (auto-released at commit/rollback) taken before
    // sequencing, so concurrent bulk imports cannot assign duplicate version numbers.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${songRow.id}::text))`;

    // Max versionNumber INCLUDING soft-deleted tabs (D1): deleted tabs keep their numbers,
    // so numbering stays monotonic and restores can never collide.
    const maxAggregate = await tx.tab.aggregate({
      _max: { versionNumber: true },
      where: { songId: songRow.id, includeDeleted: true } as never,
    });
    let nextVersionNumber = (maxAggregate._max.versionNumber ?? 0) + 1;

    // D5: dedupe set seeded from the song's non-deleted tab contents (Q1 — soft-deleted
    // tabs do not block re-import); also covers within-batch duplicates via seen.add.
    const existingTabs = await tx.tab.findMany({
      where: { songId: songRow.id },
      select: { content: true },
    });
    const seenContents = new Set<string>(existingTabs.map((tab): string => tab.content));

    let tabsInserted = 0;
    let tabsSkipped = 0;

    for (const version of song.versions) {
      // Q1 dedupe on verbatim bytes — skipped versions do not advance sequencing (AC2.4).
      if (seenContents.has(version.content)) {
        tabsSkipped += 1;
        continue;
      }

      // Q-A merge: per-version value wins; defaults fill only absent fields (AC1.2).
      const effectiveStatus = version.status ?? defaults.status;
      const normalized = normalizeAdminStatus(effectiveStatus, adminUserId);

      await tx.tab.create({
        data: {
          songId: songRow.id,
          authorUserId: adminUserId,
          content: version.content,
          tabType: version.tabType,
          instrument: version.instrument ?? defaults.instrument,
          difficulty: version.difficulty ?? defaults.difficulty,
          titleOverride: version.titleOverride ?? null,
          status: normalized.status,
          submittedAt: normalized.meta.submittedAt ?? null,
          publishedAt: normalized.meta.publishedAt ?? null,
          moderatedByUserId: normalized.meta.moderatedByUserId ?? null,
          moderationNotes: normalized.meta.moderationNotes ?? null,
          // Explicit sequencing — the single-create versionNumber:1 hardcode is not on
          // this path (design D4).
          versionNumber: nextVersionNumber,
        },
      });

      seenContents.add(version.content);
      nextVersionNumber += 1;
      tabsInserted += 1;
    }

    return {
      title: song.title,
      songStatus: songCreated ? 'created' : 'reused',
      songId: songRow.id,
      tabsInserted,
      tabsSkipped,
    };
  }
}
