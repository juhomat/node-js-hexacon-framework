/**
 * Pagination types for data retrieval
 */

export interface Pagination {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}
