import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { Tab, User } from '@src/generated/prisma/client';
import { TabStatus, UserRole } from '@src/generated/prisma/client';

import type {
  ITabRepository,
  ListCursorParams,
  PaginatedResult,
  FindPublishedFilters,
  TabWithAuthor,
  UpdateContentData,
} from './ports/tab-repository.port';
import { TAB_REPOSITORY } from './ports/tab-repository.port';
import { CreateTabUseCase } from './use-cases/create-tab.use-case';
import type { CreateTabInput } from './use-cases/create-tab.use-case';
import { PublishTabUseCase } from './use-cases/publish-tab.use-case';
import { RejectTabUseCase } from './use-cases/reject-tab.use-case';
import { SubmitTabUseCase } from './use-cases/submit-tab.use-case';

const EDITABLE_STATUSES: TabStatus[] = [TabStatus.DRAFT, TabStatus.REJECTED];

@Injectable()
export class TabsService {
  constructor(
    @Inject(TAB_REPOSITORY) private readonly tabRepository: ITabRepository,
    private readonly createTabUseCase: CreateTabUseCase,
    private readonly submitTabUseCase: SubmitTabUseCase,
    private readonly publishTabUseCase: PublishTabUseCase,
    private readonly rejectTabUseCase: RejectTabUseCase,
  ) {}

  async listPublished(filters: FindPublishedFilters): Promise<PaginatedResult<TabWithAuthor>> {
    return this.tabRepository.findPublished(filters);
  }

  async findById(id: string): Promise<TabWithAuthor | null> {
    return this.tabRepository.findById(id);
  }

  async findPublicDetail(id: string, user?: User): Promise<TabWithAuthor> {
    const tab = await this.tabRepository.findById(id);

    if (!tab || tab.deletedAt !== null) {
      throw new NotFoundException({ code: 'TAB_NOT_FOUND', message: 'Tab not found' });
    }

    const isOwner = user !== undefined && tab.authorUserId === user.id;
    const isAdmin = user !== undefined && user.role === UserRole.ADMIN;

    if (tab.status === TabStatus.PUBLISHED || isOwner || isAdmin) {
      return tab;
    }

    throw new NotFoundException({ code: 'TAB_NOT_FOUND', message: 'Tab not found' });
  }

  async listUserTabs(userId: string, params: ListCursorParams): Promise<PaginatedResult<Tab>> {
    return this.tabRepository.findByUser(userId, params);
  }

  async createTab(input: CreateTabInput): Promise<Tab> {
    return this.createTabUseCase.execute(input);
  }

  async updateTab(tabId: string, userId: string, data: UpdateContentData): Promise<Tab> {
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

    if (!EDITABLE_STATUSES.includes(tab.status)) {
      throw new ConflictException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot edit a tab with status ${tab.status}`,
      });
    }

    return this.tabRepository.updateContent(tabId, data);
  }

  async submitTab(tabId: string, userId: string): Promise<Tab> {
    return this.submitTabUseCase.execute(tabId, userId);
  }

  async softDeleteTab(tabId: string, userId: string): Promise<void> {
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

    await this.tabRepository.softDelete(tabId);
  }

  async publishTab(tabId: string, moderatorUserId: string): Promise<Tab> {
    return this.publishTabUseCase.execute(tabId, moderatorUserId);
  }

  async rejectTab(tabId: string, moderatorUserId: string, notes: string): Promise<Tab> {
    return this.rejectTabUseCase.execute(tabId, moderatorUserId, notes);
  }
}
