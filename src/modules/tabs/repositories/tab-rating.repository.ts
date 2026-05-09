import { Injectable } from '@nestjs/common';

import type { TabRating } from '@src/generated/prisma/client';
import { PrismaService } from '@src/prisma/prisma.service';

export interface TabRatingAggregateResult {
  average: number;
  count: number;
}

@Injectable()
export class TabRatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(tabId: string, userId: string, rating: number): Promise<TabRating> {
    return this.prisma.tabRating.upsert({
      where: { tabId_userId: { tabId, userId } },
      create: { tabId, userId, rating },
      update: { rating },
    });
  }

  async findByTabAndUser(tabId: string, userId: string): Promise<TabRating | null> {
    return this.prisma.tabRating.findUnique({
      where: { tabId_userId: { tabId, userId } },
    });
  }

  async getAggregate(tabId: string): Promise<TabRatingAggregateResult> {
    const result = await this.prisma.tabRating.aggregate({
      where: { tabId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      average: result._avg.rating ?? 0,
      count: result._count.rating,
    };
  }
}
