import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { Tab } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import { canTransition } from '../constants/tab-status-transitions';
import type { ITabRepository } from '../ports/tab-repository.port';
import { TAB_REPOSITORY } from '../ports/tab-repository.port';

@Injectable()
export class SubmitTabUseCase {
  constructor(@Inject(TAB_REPOSITORY) private readonly tabRepository: ITabRepository) {}

  async execute(tabId: string, userId: string): Promise<Tab> {
    const tab = await this.tabRepository.findById(tabId);

    if (!tab) {
      throw new NotFoundException({ code: 'TAB_NOT_FOUND', message: 'Tab not found' });
    }

    if (tab.authorUserId !== userId) {
      throw new ForbiddenException({
        code: 'OWNERSHIP_VIOLATION',
        message: 'You do not own this tab',
      });
    }

    if (!canTransition(tab.status, TabStatus.PENDING)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition from ${tab.status} to PENDING`,
      });
    }

    return this.tabRepository.updateStatus(tabId, TabStatus.PENDING, {
      submittedAt: new Date(),
    });
  }
}
