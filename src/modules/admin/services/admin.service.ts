import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { Tab, User } from '@src/generated/prisma/client';
import { TabStatus, UserStatus } from '@src/generated/prisma/client';

import { UserRepository } from '@modules/auth/repositories/user.repository';
import type { ListUsersParams } from '@modules/auth/repositories/user.repository';
import type {
  AdminTabRow,
  FindAllAdminFilters,
  ITabRepository,
  OffsetPaginatedResult,
} from '@modules/tabs/ports/tab-repository.port';
import { TAB_REPOSITORY } from '@modules/tabs/ports/tab-repository.port';
import { TabsService } from '@modules/tabs/tabs.service';

import type { CreateAdminTabInput } from '../dto/create-admin-tab.schema';
import type { UpdateAdminTabInput } from '../dto/update-admin-tab.schema';

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

  async listTabs(filters: FindAllAdminFilters): Promise<OffsetPaginatedResult<AdminTabRow>> {
    return this.tabRepository.findAllAdmin(filters);
  }

  async getTabById(tabId: string): Promise<AdminTabRow> {
    const tab = await this.tabRepository.findAdminById(tabId);

    if (!tab) {
      throw new NotFoundException({ code: 'TAB_NOT_FOUND', message: 'Tab not found' });
    }

    return tab;
  }

  async createTab(input: CreateAdminTabInput, adminUserId: string): Promise<Tab> {
    return this.tabsService.createAdminTab(input, adminUserId);
  }

  async updateTab(tabId: string, input: UpdateAdminTabInput, adminUserId: string): Promise<Tab> {
    return this.tabsService.updateAdminTab(tabId, input, adminUserId);
  }

  async deleteTab(tabId: string): Promise<void> {
    await this.tabsService.softDeleteAdminTab(tabId);
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

  async changeUserStatus(
    targetUserId: string,
    status: UserStatus,
    currentUserId: string,
  ): Promise<User> {
    if (targetUserId === currentUserId) {
      throw new ForbiddenException({
        code: 'SELF_STATUS_CHANGE',
        message: 'Cannot change your own status',
      });
    }

    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    const blockedAt = status === UserStatus.BLOCKED ? new Date() : null;

    return this.userRepository.updateStatus(targetUserId, status, blockedAt);
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
