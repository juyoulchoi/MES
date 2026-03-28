export const PAGE_SIZE = 10;

interface PageableResponse<T> {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
}

export function EmptyPageResult<T>(page = 0, size = 10): PageResult<T> {
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    page,
    size,
    first: page <= 0,
    last: true,
    numberOfElements: 0,
  };
}

export function toPageResult<T>(
  data: PageableResponse<T> | T[],
  page: number,
  size: number
): PageResult<T> {
  if (Array.isArray(data)) {
    return {
      content: data,
      totalElements: data.length,
      totalPages: data.length > 0 ? 1 : 0,
      page,
      size,
      first: page <= 0,
      last: true,
      numberOfElements: data.length,
    };
  }

  const content = Array.isArray(data?.content) ? data.content : [];

  return {
    content,
    totalElements: data?.totalElements ?? content.length,
    totalPages: data?.totalPages ?? (content.length > 0 ? 1 : 0),
    page: data?.number ?? page,
    size: data?.size ?? size,
    first: data?.first ?? page <= 0,
    last: data?.last ?? true,
    numberOfElements: data?.numberOfElements ?? content.length,
  };
}
