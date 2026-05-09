import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { TabRating } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import type { ITabRepository } from '../ports/tab-repository.port';
import { TAB_REPOSITORY } from '../ports/tab-repository.port';
import type { TabRatingAggregateResult } from '../repositories/tab-rating.repository';
import { TabRatingRepository } from '../repositories/tab-rating.repository';

@Injectable()
export class TabRatingService {
  constructor(
    @Inject(TAB_REPOSITORY) private readonly tabRepository: ITabRepository,
    private readonly tabRatingRepository: TabRatingRepository,
  ) {}

  async rateTab(tabId: string, userId: string, rating: number): Promise<TabRating> {
    await this.assertPublishedTab(tabId);
    return this.tabRatingRepository.upsert(tabId, userId, rating);
  }

  async getAggregate(tabId: string): Promise<TabRatingAggregateResult> {
    await this.assertPublishedTab(tabId);
    return this.tabRatingRepository.getAggregate(tabId);
  }

  async getUserRating(tabId: string, userId: string): Promise<TabRating> {
    const rating = await this.tabRatingRepository.findByTabAndUser(tabId, userId);

    if (!rating) {
      throw new NotFoundException({
        code: 'RATING_NOT_FOUND',
        message: 'You have not rated this tab',
      });
    }

    return rating;
  }

  private async assertPublishedTab(tabId: string): Promise<void> {
    const tab = await this.tabRepository.findById(tabId);

    if (!tab || tab.deletedAt !== null) {
      throw new NotFoundException({ code: 'TAB_NOT_FOUND', message: 'Tab not found' });
    }

    if (tab.status !== TabStatus.PUBLISHED) {
      throw new NotFoundException({ code: 'TAB_NOT_FOUND', message: 'Tab not found' });
    }
  }
}
