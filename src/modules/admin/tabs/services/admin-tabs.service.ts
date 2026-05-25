import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { Tab } from '@src/generated/prisma/client';

import type {
  AdminTabRow,
  FindAllAdminFilters,
  ITabRepository,
  OffsetPaginatedResult,
} from '@modules/tabs/ports/tab-repository.port';
import { TAB_REPOSITORY } from '@modules/tabs/ports/tab-repository.port';
import { TabsService } from '@modules/tabs/tabs.service';

import type { CreateAdminTabInput } from '../dto/requests/create-admin-tab.schema';
import type { UpdateAdminTabInput } from '../dto/requests/update-admin-tab.schema';

@Injectable()
export class AdminTabsService {
  constructor(
    private readonly tabsService: TabsService,
    @Inject(TAB_REPOSITORY) private readonly tabRepository: ITabRepository,
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
}
