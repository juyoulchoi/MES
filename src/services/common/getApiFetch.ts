import { useState } from 'react';
import { getApi } from '@/lib/axiosClient';
import { EmptyPageResult, toPageResult, type PageResult, type PageableResponse, PAGE_SIZE } from '@/lib/pagination';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

export interface FetchRequest<TForm> {
  form: TForm;
}

export interface PageFetchRequest<TForm> extends FetchRequest<TForm> {
  page: number;
  pageSize: number;
}

interface ApiFetchOption<TRequest> {
  apiPath: string;
  mapParams: (request: TRequest) => QueryParams;
}

interface UsePageApiFetchOption<TForm> extends ApiFetchOption<PageFetchRequest<TForm>> {
  form: TForm;
  pageSize?: number;
  initialPage?: number;
  includePageParam?: boolean;
  includePageSizeParam?: boolean;
  includeSizeParam?: boolean;
}

function toApiParams(params?: QueryParams): Record<string, string> | undefined {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

export function getApiDataFetch<TForm, TResponse>({
  apiPath,
  mapParams,
}: ApiFetchOption<FetchRequest<TForm>>) {
  return async (request: FetchRequest<TForm>): Promise<TResponse> => {
    return getApi<TResponse>(apiPath, toApiParams(mapParams(request)));
  };
}

function getApiFetch<TForm, TRow>({
  apiPath,
  mapParams,
  includePageParam = true,
  includePageSizeParam = false,
  includeSizeParam = true,
}: ApiFetchOption<PageFetchRequest<TForm>> & {
  includePageParam?: boolean;
  includePageSizeParam?: boolean;
  includeSizeParam?: boolean;
}) {
  return async (request: PageFetchRequest<TForm>): Promise<PageResult<TRow>> => {
    const page = request.page ?? 0;
    const size = request.pageSize ?? PAGE_SIZE;
    const pagingParams: QueryParams = {
      ...(includePageParam ? { page } : {}),
      ...(includePageSizeParam ? { pageSize: size } : {}),
      ...(includeSizeParam ? { size } : {}),
    };
    const data = await getApi<PageableResponse<TRow> | TRow[]>(
      apiPath,
      toApiParams({
        ...mapParams(request),
        ...pagingParams,
      })
    );

    return toPageResult<TRow>(data, page, size);
  };
}

export function usePageApiFetch<TForm, TRow>({
  apiPath,
  mapParams,
  form,
  pageSize = PAGE_SIZE,
  initialPage = 0,
  includePageParam = true,
  includePageSizeParam = false,
  includeSizeParam = true,
}: UsePageApiFetchOption<TForm>) {
  const [result, setResult] = useState<PageResult<TRow>>(() =>
    EmptyPageResult<TRow>(initialPage, pageSize)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async (nextPage = initialPage) => {
    setLoading(true);
    setError(null);

    try {
      const search = getApiFetch<TForm, TRow>({
        apiPath,
        mapParams,
        includePageParam,
        includePageSizeParam,
        includeSizeParam,
      });
      setResult(
        await search({
          form,
          page: nextPage,
          pageSize,
        })
      );
    } catch (e) {
      setResult(EmptyPageResult<TRow>(nextPage, pageSize));
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return {
    result,
    setResult,
    loading,
    setLoading,
    error,
    setError,
    fetchList,
  };
}

