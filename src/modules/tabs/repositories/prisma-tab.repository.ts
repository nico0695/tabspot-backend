import { BadRequestException, Injectable } from '@nestjs/common';

import type { Tab, TabStatus } from '@src/generated/prisma/client';
import { TabStatus as TabStatusEnum } from '@src/generated/prisma/client';
import type { TabWhereInput } from '@src/generated/prisma/models';
import { PrismaService } from '@src/prisma/prisma.service';

import type {
  CreateTabData,
  FindPublishedFilters,
  ITabRepository,
  ListCursorParams,
  PaginatedResult,
  TabWithAuthor,
  UpdateContentData,
  UpdateStatusMeta,
} from '../ports/tab-repository.port';

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

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2003'
  );
}

@Injectable()
export class PrismaTabRepository implements ITabRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TabWithAuthor | null> {
    return this.prisma.tab.findUnique({
      where: { id },
      include: { author: { select: { displayName: true } } },
    });
  }

  async findPublished(filters: FindPublishedFilters): Promise<PaginatedResult<TabWithAuthor>> {
    const where: TabWhereInput = {
      status: TabStatusEnum.PUBLISHED,
      deletedAt: null,
    };

    if (filters.cursor !== undefined) {
      const decoded = decodeCursor(filters.cursor);
      where.id = { gt: decoded.id };
    }
    if (filters.songId !== undefined) {
      where.songId = filters.songId;
    }
    if (filters.tabType !== undefined) {
      where.tabType = filters.tabType as Tab['tabType'];
    }
    if (filters.instrument !== undefined) {
      where.instrument = filters.instrument as Tab['instrument'];
    }
    if (filters.difficulty !== undefined) {
      where.difficulty = filters.difficulty as Tab['difficulty'];
    }

    const rows = await this.prisma.tab.findMany({
      where,
      orderBy: { id: 'asc' },
      take: filters.limit + 1,
      include: { author: { select: { displayName: true } } },
    });

    const hasMore = rows.length > filters.limit;
    const items = hasMore ? rows.slice(0, filters.limit) : rows;
    const nextCursor = hasMore ? encodeCursor(items[items.length - 1].id) : null;

    return { items, nextCursor, hasMore };
  }

  async findByUser(userId: string, params: ListCursorParams): Promise<PaginatedResult<Tab>> {
    const where: TabWhereInput = { authorUserId: userId, deletedAt: null };

    if (params.cursor !== undefined) {
      const decoded = decodeCursor(params.cursor);
      where.id = { gt: decoded.id };
    }

    const rows = await this.prisma.tab.findMany({
      where,
      orderBy: { id: 'asc' },
      take: params.limit + 1,
    });

    const hasMore = rows.length > params.limit;
    const items = hasMore ? rows.slice(0, params.limit) : rows;
    const nextCursor = hasMore ? encodeCursor(items[items.length - 1].id) : null;

    return { items, nextCursor, hasMore };
  }

  async create(data: CreateTabData): Promise<Tab> {
    try {
      return await this.prisma.tab.create({
        data: {
          songId: data.songId,
          authorUserId: data.authorUserId,
          content: data.content,
          tabType: data.tabType as Tab['tabType'],
          instrument: data.instrument as Tab['instrument'],
          difficulty: data.difficulty as Tab['difficulty'],
          titleOverride: data.titleOverride ?? null,
          versionNumber: 1,
        },
      });
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        throw new BadRequestException({ code: 'INVALID_SONG_ID', message: 'Song not found' });
      }
      throw err;
    }
  }

  async updateStatus(id: string, status: TabStatus, meta?: UpdateStatusMeta): Promise<Tab> {
    return this.prisma.tab.update({
      where: { id },
      data: {
        status,
        ...(meta?.submittedAt !== undefined && { submittedAt: meta.submittedAt }),
        ...(meta?.publishedAt !== undefined && { publishedAt: meta.publishedAt }),
        ...(meta?.moderatedByUserId !== undefined && {
          moderatedByUserId: meta.moderatedByUserId,
        }),
        ...(meta?.moderationNotes !== undefined && { moderationNotes: meta.moderationNotes }),
      },
    });
  }

  async updateContent(id: string, data: UpdateContentData): Promise<Tab> {
    return this.prisma.tab.update({
      where: { id },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.tabType !== undefined && { tabType: data.tabType as Tab['tabType'] }),
        ...(data.instrument !== undefined && { instrument: data.instrument as Tab['instrument'] }),
        ...(data.difficulty !== undefined && { difficulty: data.difficulty as Tab['difficulty'] }),
        ...(data.titleOverride !== undefined && { titleOverride: data.titleOverride }),
      },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.tab.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
