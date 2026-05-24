import { Injectable } from '@nestjs/common';

import { encodeCursor, decodeCursor } from '@common/utils/cursor';
import type { Song } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';
import type { SongOrderByWithRelationInput, SongWhereInput } from '@src/generated/prisma/models';
import { PrismaService } from '@src/prisma/prisma.service';

export interface SongWithArtistAndGenres extends Song {
  artist: { id: string; name: string; slug: string };
  songGenres: { genre: { id: string; name: string; slug: string } }[];
}

export interface SongListOffsetParams {
  page: number;
  pageSize: number;
  q?: string;
  artistId?: string;
  includeDeleted?: boolean;
}

export interface SongListOffsetResult {
  items: SongWithArtistAndGenres[];
  totalCount: number;
}

export interface ListCursorParams {
  cursor?: string;
  limit: number;
  q?: string;
  artistId?: string;
  genreId?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface ListCursorResult {
  items: Song[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class SongRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Song[]> {
    return this.prisma.song.findMany({ orderBy: { title: 'asc' } });
  }

  async listCursor(params: ListCursorParams): Promise<ListCursorResult> {
    const sortBy = params.sortBy ?? 'title';
    const order = params.order ?? 'asc';

    const where: SongWhereInput = {};

    // ── cursor (sort-aware keyset pagination) ──────────────────────────
    if (params.cursor !== undefined) {
      const decoded = decodeCursor(params.cursor);
      if (decoded.sortBy && decoded.sortValue !== undefined && decoded.sortValue !== null) {
        const comp = order === 'desc' ? 'lt' : 'gt';
        if (decoded.sortBy === 'title') {
          where.OR = [
            { title: { [comp]: decoded.sortValue } },
            { title: decoded.sortValue, id: { [comp]: decoded.id } },
          ];
        } else if (decoded.sortBy === 'createdAt') {
          const sortDate = new Date(decoded.sortValue);
          where.OR = [
            { createdAt: { [comp]: sortDate } },
            { createdAt: sortDate, id: { [comp]: decoded.id } },
          ];
        }
      } else {
        // Legacy id-only cursor
        where.id = { gt: decoded.id };
      }
    }

    // ── scalar filters ─────────────────────────────────────────────────
    if (params.q !== undefined) {
      where.title = { contains: params.q, mode: 'insensitive' };
    }
    if (params.artistId !== undefined) {
      where.artistId = params.artistId;
    }

    // ── relation filter (genreId → songGenres) ─────────────────────────
    if (params.genreId !== undefined) {
      where.songGenres = { some: { genreId: params.genreId } };
    }

    // ── orderBy (composite for stable pagination) ──────────────────────
    const orderBy: SongOrderByWithRelationInput[] = [{ [sortBy]: order }, { id: order }];

    const rows = await this.prisma.song.findMany({
      where,
      orderBy,
      take: params.limit + 1,
    });

    const hasMore = rows.length > params.limit;
    const items = hasMore ? rows.slice(0, params.limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore) {
      const lastItem = items[items.length - 1];
      let sortValue: string | undefined;
      if (sortBy === 'title') {
        sortValue = lastItem.title;
      } else if (sortBy === 'createdAt') {
        sortValue = lastItem.createdAt.toISOString();
      }
      nextCursor = encodeCursor({ id: lastItem.id, sortBy, sortValue });
    }

    return { items, nextCursor, hasMore };
  }

  private readonly songInclude = {
    artist: { select: { id: true, name: true, slug: true } },
    songGenres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
  } as const;

  async create(data: {
    artistId: string;
    title: string;
    slug: string;
    subtitle?: string | null;
    releaseYear?: number | null;
  }): Promise<Song> {
    return this.prisma.song.create({ data });
  }

  async findById(id: string): Promise<SongWithArtistAndGenres | null> {
    return this.prisma.song.findUnique({
      where: { id, includeDeleted: true } as never,
      include: this.songInclude,
    }) as Promise<SongWithArtistAndGenres | null>;
  }

  async findBySlug(slug: string): Promise<SongWithArtistAndGenres | null> {
    return this.prisma.song.findFirst({
      where: { slug },
      include: this.songInclude,
    }) as Promise<SongWithArtistAndGenres | null>;
  }

  async findByArtistAndSlug(artistId: string, slug: string): Promise<Song | null> {
    return this.prisma.song.findFirst({
      where: { artistId, slug, includeDeleted: true } as never,
    });
  }

  async update(
    id: string,
    data: { title?: string; slug?: string; subtitle?: string | null; releaseYear?: number | null },
  ): Promise<Song> {
    return this.prisma.song.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Song> {
    return this.prisma.song.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listOffset({
    page,
    pageSize,
    q,
    artistId,
    includeDeleted,
  }: SongListOffsetParams): Promise<SongListOffsetResult> {
    const where: SongWhereInput & { includeDeleted?: boolean } = {};

    if (includeDeleted) {
      (where as Record<string, unknown>)['includeDeleted'] = true;
    }
    if (q) {
      where.title = { contains: q, mode: 'insensitive' };
    }
    if (artistId) {
      where.artistId = artistId;
    }

    const [items, totalCount] = await Promise.all([
      this.prisma.song.findMany({
        where: where as SongWhereInput,
        include: this.songInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }) as Promise<SongWithArtistAndGenres[]>,
      this.prisma.song.count({ where: where as SongWhereInput }),
    ]);

    return { items, totalCount };
  }

  async listByArtist(artistId: string): Promise<SongWithArtistAndGenres[]> {
    return this.prisma.song.findMany({
      where: { artistId },
      include: this.songInclude,
      orderBy: { title: 'asc' },
    }) as Promise<SongWithArtistAndGenres[]>;
  }

  async countPublishedTabs(songId: string): Promise<number> {
    return this.prisma.tab.count({
      where: { songId, status: TabStatus.PUBLISHED, deletedAt: null },
    });
  }

  async countPublishedTabsBatch(songIds: string[]): Promise<Map<string, number>> {
    if (songIds.length === 0) return new Map();

    const groups = await this.prisma.tab.groupBy({
      by: ['songId'],
      where: { songId: { in: songIds }, status: TabStatus.PUBLISHED, deletedAt: null },
      _count: { id: true },
    });

    const map = new Map<string, number>();
    for (const g of groups) {
      map.set(g.songId, g._count.id);
    }
    return map;
  }
}
