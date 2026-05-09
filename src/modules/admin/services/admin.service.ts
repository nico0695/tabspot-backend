import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { Tab, User } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import { UserRepository } from '@modules/auth/repositories/user.repository';
import type { ListUsersParams } from '@modules/auth/repositories/user.repository';
import type {
  FindAllAdminFilters,
  ITabRepository,
  OffsetPaginatedResult,
  TabWithAuthor,
} from '@modules/tabs/ports/tab-repository.port';
import { TAB_REPOSITORY } from '@modules/tabs/ports/tab-repository.port';
import { TabsService } from '@modules/tabs/tabs.service';

export interface DashboardData {
  totalUsers: number;
  publishedTabs: number;
  pendingTabs: number;
  newTabsThisWeek: number;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly tabsService: TabsService,
    @Inject(TAB_REPOSITORY) private readonly tabRepository: ITabRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async listTabs(filters: FindAllAdminFilters): Promise<OffsetPaginatedResult<TabWithAuthor>> {
    return this.tabRepository.findAllAdmin(filters);
  }

  async publishTab(tabId: string, moderatorUserId: string): Promise<Tab> {
    return this.tabsService.publishTab(tabId, moderatorUserId);
  }

  async rejectTab(tabId: string, moderatorUserId: string, notes: string): Promise<Tab> {
    return this.tabsService.rejectTab(tabId, moderatorUserId, notes);
  }

  async listUsers(params: ListUsersParams): Promise<{ items: User[]; totalCount: number }> {
    return this.userRepository.listPaginated(params);
  }

  async changeUserRole(
    targetUserId: string,
    role: User['role'],
    currentUserId: string,
  ): Promise<User> {
    if (targetUserId === currentUserId) {
      throw new ForbiddenException({
        code: 'SELF_ROLE_CHANGE',
        message: 'Cannot change your own role',
      });
    }

    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return this.userRepository.updateRole(targetUserId, role);
  }

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
