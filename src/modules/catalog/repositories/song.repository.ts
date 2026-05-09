import { BadRequestException, Injectable } from '@nestjs/common';

import type { Song } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';
import type { SongWhereInput } from '@src/generated/prisma/models';
import { PrismaService } from '@src/prisma/prisma.service';

export interface SongWithArtistAndGenres extends Song {
  artist: { id: string; name: string };
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
}

export interface ListCursorResult {
  items: Song[];
  nextCursor: string | null;
  hasMore: boolean;
}

function encodeCursor(id: string): string {
  return Buffer.from(JSON.stringify({ id })).toString('base64url');
}

function decodeCursor(cursor: string): { id: string } {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>)['id'] !== 'string'
    ) {
      throw new Error('malformed');
    }
    return { id: (parsed as Record<string, string>)['id'] };
  } catch {
    throw new BadRequestException({ code: 'INVALID_CURSOR', message: 'Invalid cursor' });
  }
}

@Injectable()
export class SongRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCursor({ cursor, limit, q, artistId }: ListCursorParams): Promise<ListCursorResult> {
    const where: SongWhereInput = {};

    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      where.id = { gt: decoded.id };
    }
    if (q !== undefined) {
      where.title = { contains: q, mode: 'insensitive' };
    }
    if (artistId !== undefined) {
      where.artistId = artistId;
    }

    const rows = await this.prisma.song.findMany({
      where,
      orderBy: { id: 'asc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? encodeCursor(items[items.length - 1].id) : null;

    return { items, nextCursor, hasMore };
  }

  private readonly songInclude = {
    artist: { select: { id: true, name: true } },
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

  async countPublishedTabs(songId: string): Promise<number> {
    return this.prisma.tab.count({
      where: { songId, status: TabStatus.PUBLISHED, deletedAt: null },
    });
  }
}
