import { Inject, Injectable } from '@nestjs/common';

import { UserRepository } from '@modules/auth/repositories/user.repository';
import type { ITabRepository } from '@modules/tabs/ports/tab-repository.port';
import { TAB_REPOSITORY } from '@modules/tabs/ports/tab-repository.port';
import { TabStatus } from '@src/generated/prisma/client';

export interface DashboardData {
  totalUsers: number;
  publishedTabs: number;
  pendingTabs: number;
  newTabsThisWeek: number;
}

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(TAB_REPOSITORY) private readonly tabRepository: ITabRepository,
  ) {}

  async getDashboard(): Promise<DashboardData> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [totalUsers, publishedTabs, pendingTabs, newTabsThisWeek] = await Promise.all([
      this.userRepository.countAll(),
      this.tabRepository.countByStatus(TabStatus.PUBLISHED),
      this.tabRepository.countByStatus(TabStatus.PENDING),
      this.tabRepository.countCreatedSince(oneWeekAgo),
    ]);

    return { totalUsers, publishedTabs, pendingTabs, newTabsThisWeek };
  }
}
