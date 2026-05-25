export interface OffsetPageInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pageInfo: OffsetPageInfo;
}
