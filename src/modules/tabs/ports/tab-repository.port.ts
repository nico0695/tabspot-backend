import type { Tab, TabStatus } from '@src/generated/prisma/client';

export const TAB_REPOSITORY = Symbol('TAB_REPOSITORY');

export type TabWithAuthor = Tab & { author: { displayName: string | null } };

export interface CreateTabData {
  songId: string;
  authorUserId: string;
  content: string;
  tabType: string;
  instrument: string;
  difficulty: string;
  titleOverride?: string | null;
}

export interface UpdateStatusMeta {
  submittedAt?: Date;
  publishedAt?: Date;
  moderatedByUserId?: string;
  moderationNotes?: string;
}

export interface ListCursorParams {
  cursor?: string;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FindPublishedFilters extends ListCursorParams {
  songId?: string;
  tabType?: string;
  instrument?: string;
  difficulty?: string;
}

export interface OffsetPaginationParams {
  page: number;
  pageSize: number;
}

export interface OffsetPaginatedResult<T> {
  items: T[];
  totalCount: number;
}

export interface FindAllAdminFilters extends OffsetPaginationParams {
  status?: TabStatus;
  includeDeleted?: boolean;
}

export interface UpdateContentData {
  content?: string;
  tabType?: string;
  instrument?: string;
  difficulty?: string;
  titleOverride?: string | null;
}

export interface ITabRepository {
  findById(id: string): Promise<TabWithAuthor | null>;
  findPublished(filters: FindPublishedFilters): Promise<PaginatedResult<TabWithAuthor>>;
  findByUser(userId: string, params: ListCursorParams): Promise<PaginatedResult<Tab>>;
  create(data: CreateTabData): Promise<Tab>;
  updateStatus(id: string, status: TabStatus, meta?: UpdateStatusMeta): Promise<Tab>;
  updateContent(id: string, data: UpdateContentData): Promise<Tab>;
  softDelete(id: string): Promise<void>;
  findAllAdmin(filters: FindAllAdminFilters): Promise<OffsetPaginatedResult<TabWithAuthor>>;
  countByStatus(status: TabStatus): Promise<number>;
  countCreatedSince(since: Date): Promise<number>;
}
