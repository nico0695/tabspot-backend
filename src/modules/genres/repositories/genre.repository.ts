import { BadRequestException, Injectable } from '@nestjs/common';

import type { Genre } from '@src/generated/prisma/client';
import type { GenreWhereInput } from '@src/generated/prisma/models';
import { PrismaService } from '@src/prisma/prisma.service';

export interface GenreListOffsetParams {
  page: number;
  pageSize: number;
  q?: string;
  includeDeleted?: boolean;
}

export interface GenreListOffsetResult {
  items: Genre[];
  totalCount: number;
}

export interface ListCursorParams {
  cursor?: string;
  limit: number;
}

export interface ListCursorResult {
  items: Genre[];
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
export class GenreRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCursor({ cursor, limit }: ListCursorParams): Promise<ListCursorResult> {
    const where: GenreWhereInput = {};

    if (cursor !== undefined) {
      const decoded = decodeCursor(cursor);
      where.id = { gt: decoded.id };
    }

    const rows = await this.prisma.genre.findMany({
      where,
      orderBy: { id: 'asc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? encodeCursor(items[items.length - 1].id) : null;

    return { items, nextCursor, hasMore };
  }

  async create(data: { name: string; slug: string }): Promise<Genre> {
    return this.prisma.genre.create({ data });
  }

  async findById(id: string): Promise<Genre | null> {
    return this.prisma.genre.findUnique({ where: { id, includeDeleted: true } as never });
  }

  async findBySlug(slug: string): Promise<Genre | null> {
    return this.prisma.genre.findFirst({ where: { slug, includeDeleted: true } as never });
  }

  async findByIds(ids: string[]): Promise<Genre[]> {
    return this.prisma.genre.findMany({ where: { id: { in: ids }, deletedAt: null } });
  }

  async update(id: string, data: { name?: string; slug?: string }): Promise<Genre> {
    return this.prisma.genre.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Genre> {
    return this.prisma.genre.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async listOffset({
    page,
    pageSize,
    q,
    includeDeleted,
  }: GenreListOffsetParams): Promise<GenreListOffsetResult> {
    const where: GenreWhereInput & { includeDeleted?: boolean } = {};

    if (includeDeleted) {
      (where as Record<string, unknown>)['includeDeleted'] = true;
    }
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    const [items, totalCount] = await Promise.all([
      this.prisma.genre.findMany({
        where: where as GenreWhereInput,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.genre.count({ where: where as GenreWhereInput }),
    ]);

    return { items, totalCount };
  }

  async countActiveSongAssociations(genreId: string): Promise<number> {
    return this.prisma.songGenre.count({
      where: { genreId, song: { deletedAt: null } },
    });
  }
}
