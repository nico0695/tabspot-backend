import type { Tab, TabStatus } from '@src/generated/prisma/client';

export const TAB_REPOSITORY = Symbol('TAB_REPOSITORY');

export type TabWithAuthor = Tab & { author: { displayName: string | null } };

export type AdminTabAuthor = {
  id: string;
  displayName: string | null;
  email: string;
  status: string;
  role: string;
};

export type AdminTabSong = {
  id: string;
  title: string;
  slug: string;
  deletedAt: Date | null;
  artist: { id: string; name: string; slug: string };
};

export type AdminTabRow = Tab & {
  author: AdminTabAuthor;
  song: AdminTabSong;
};

export type TabDetailRow = TabWithAuthor & {
  song: {
    id: string;
    title: string;
    slug: string;
    subtitle: string | null;
    releaseYear: number | null;
    artist: { id: string; name: string; slug: string };
    songGenres: Array<{ genre: { id: string; name: string; slug: string } }>;
  };
};

export interface CreateTabData {
  songId: string;
  authorUserId: string;
  content: string;
  tabType: string;
  instrument: string;
  difficulty: string;
  titleOverride?: string | null;
  status?: TabStatus;
  submittedAt?: Date | null;
  publishedAt?: Date | null;
  moderatedByUserId?: string | null;
  moderationNotes?: string | null;
}

export interface UpdateStatusMeta {
  submittedAt?: Date | null;
  publishedAt?: Date | null;
  moderatedByUserId?: string | null;
  moderationNotes?: string | null;
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
  genreId?: string;
  artistId?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
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

export interface AdminCreateTabInput {
  songId: string;
  content: string;
  tabType: string;
  instrument: string;
  difficulty: string;
  titleOverride?: string | null;
  status?: TabStatus;
  moderationNotes?: string | null;
}

export interface AdminUpdateTabInput {
  content?: string;
  tabType?: string;
  instrument?: string;
  difficulty?: string;
  titleOverride?: string | null;
  status?: TabStatus;
  moderationNotes?: string | null;
}

export interface UpdateContentData {
  content?: string;
  tabType?: string;
  instrument?: string;
  difficulty?: string;
  titleOverride?: string | null;
  moderationNotes?: string | null;
}

export interface ITabRepository {
  findById(id: string): Promise<TabDetailRow | null>;
  findAdminById(id: string): Promise<AdminTabRow | null>;
  findPublished(filters: FindPublishedFilters): Promise<PaginatedResult<TabWithAuthor>>;
  findByUser(userId: string, params: ListCursorParams): Promise<PaginatedResult<Tab>>;
  create(data: CreateTabData): Promise<Tab>;
  updateStatus(id: string, status: TabStatus, meta?: UpdateStatusMeta): Promise<Tab>;
  updateContent(id: string, data: UpdateContentData): Promise<Tab>;
  softDelete(id: string): Promise<void>;
  findAllAdmin(filters: FindAllAdminFilters): Promise<OffsetPaginatedResult<AdminTabRow>>;
  countByStatus(status: TabStatus): Promise<number>;
  countCreatedSince(since: Date): Promise<number>;
}
