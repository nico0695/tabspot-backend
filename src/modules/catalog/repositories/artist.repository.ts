import { BadRequestException, Injectable } from '@nestjs/common';

import type { Artist } from '@src/generated/prisma/client';
import type { ArtistWhereInput } from '@src/generated/prisma/models';
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
}

export interface ListCursorResult {
  items: Artist[];
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
export class ArtistRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCursor({ cursor, limit, q }: ListCursorParams): Promise<ListCursorResult> {
    const where: ArtistWhereInput = {};

    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      where.id = { gt: decoded.id };
    }
    if (q !== undefined) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    const rows = await this.prisma.artist.findMany({
      where,
      orderBy: { id: 'asc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? encodeCursor(items[items.length - 1].id) : null;

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
