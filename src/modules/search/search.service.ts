import { Injectable } from '@nestjs/common';

import { TabStatus } from '@src/generated/prisma/client';
import { PrismaService } from '@src/prisma/prisma.service';

import type { SearchQueryParams } from './dto/search-query.schema';
import type { SearchResponse } from './dto/search-response.schema';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(params: SearchQueryParams): Promise<SearchResponse> {
    const { q, limit } = params;

    const [artists, songs, tabs] = await Promise.all([
      this.prisma.artist.findMany({
        where: { name: { contains: q, mode: 'insensitive' } },
        select: { id: true, name: true, slug: true },
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.song.findMany({
        where: { title: { contains: q, mode: 'insensitive' } },
        select: {
          id: true,
          title: true,
          slug: true,
          artist: { select: { id: true, name: true, slug: true } },
        },
        take: limit,
        orderBy: { title: 'asc' },
      }),
      this.prisma.tab.findMany({
        where: {
          song: { title: { contains: q, mode: 'insensitive' } },
          status: TabStatus.PUBLISHED,
          deletedAt: null,
        },
        select: {
          id: true,
          tabType: true,
          instrument: true,
          difficulty: true,
          song: { select: { title: true } },
          author: { select: { displayName: true } },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      artists,
      songs,
      tabs: tabs.map((t) => ({
        id: t.id,
        songTitle: t.song.title,
        tabType: t.tabType,
        instrument: t.instrument,
        difficulty: t.difficulty,
        authorDisplayName: t.author.displayName,
      })),
    };
  }
}
