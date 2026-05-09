import { Injectable } from '@nestjs/common';

import { encodeCursor, decodeCursor } from '@common/utils/cursor';
import type { Artist } from '@src/generated/prisma/client';
import type {
  ArtistOrderByWithRelationInput,
  ArtistWhereInput,
} from '@src/generated/prisma/models';
import { PrismaService } from '@src/prisma/prisma.service';

export interface ListOffsetParams {
  page: number;
  pageSize: number;
  q?: string;
  includeDeleted?: boolean;
}

export interface ListOffsetResult<T> {
  items: T[];
  totalCount: number;
}

export interface ListCursorParams {
  cursor?: string;
  limit: number;
  q?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface ListCursorResult {
  items: Artist[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class ArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCursor({
    cursor,
    limit,
    q,
    sortBy: rawSortBy,
    order: rawOrder,
  }: ListCursorParams): Promise<ListCursorResult> {
    const sortBy = rawSortBy ?? 'name';
    const order = rawOrder ?? 'asc';

    const where: ArtistWhereInput = {};

    // ── cursor (sort-aware keyset pagination) ──────────────────────────
    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      if (decoded.sortBy && decoded.sortValue !== undefined) {
        const comp = order === 'desc' ? 'lt' : 'gt';
        if (decoded.sortBy === 'name') {
          where.OR = [
            { name: { [comp]: decoded.sortValue } },
            { name: decoded.sortValue as string, id: { [comp]: decoded.id } },
          ];
        } else if (decoded.sortBy === 'createdAt') {
          const sortDate = new Date(decoded.sortValue as string);
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

    if (q !== undefined) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    // ── orderBy (composite for stable pagination) ──────────────────────
    const orderBy: ArtistOrderByWithRelationInput[] = [{ [sortBy]: order }, { id: order }];

    const rows = await this.prisma.artist.findMany({
      where,
      orderBy,
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasMore) {
      const lastItem = items[items.length - 1];
      let sortValue: string | undefined;
      if (sortBy === 'name') {
        sortValue = lastItem.name;
      } else if (sortBy === 'createdAt') {
        sortValue = lastItem.createdAt.toISOString();
      }
      nextCursor = encodeCursor({ id: lastItem.id, sortBy, sortValue });
    }

    return { items, nextCursor, hasMore };
  }

  async create(data: { name: string; slug: string; sortName?: string | null }): Promise<Artist> {
    return this.prisma.artist.create({ data });
  }

  async findById(id: string): Promise<Artist | null> {
    return this.prisma.artist.findUnique({ where: { id, includeDeleted: true } as never });
  }

  async findBySlug(slug: string): Promise<Artist | null> {
    return this.prisma.artist.findFirst({ where: { slug, includeDeleted: true } as never });
  }

  async update(
    id: string,
    data: { name?: string; slug?: string; sortName?: string | null },
  ): Promise<Artist> {
    return this.prisma.artist.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Artist> {
    return this.prisma.artist.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listOffset({
    page,
    pageSize,
    q,
    includeDeleted,
  }: ListOffsetParams): Promise<ListOffsetResult<Artist>> {
    const where: ArtistWhereInput & { includeDeleted?: boolean } = {};

    if (includeDeleted) {
      (where as Record<string, unknown>)['includeDeleted'] = true;
    }
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    const [items, totalCount] = await Promise.all([
      this.prisma.artist.findMany({
        where: where as ArtistWhereInput,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.artist.count({ where: where as ArtistWhereInput }),
    ]);

    return { items, totalCount };
  }

  async countActiveSongs(artistId: string): Promise<number> {
    return this.prisma.song.count({ where: { artistId, deletedAt: null } });
  }
}
