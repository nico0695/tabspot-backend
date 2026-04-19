import { BadRequestException, Injectable } from '@nestjs/common';

import type { Song } from '@src/generated/prisma/client';
import type { SongWhereInput } from '@src/generated/prisma/models';
import { PrismaService } from '@src/prisma/prisma.service';

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
}
