import { getApi } from '@/lib/axiosClient';
import { PAGE_SIZE, toPageResult, type PageResult, type PageableResponse } from '@/lib/pagination';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

export interface SearchForm {
  poYmd: string;
  cstCd: string;
  itemGb: string;
  poSeq?: string;
}

export interface DetailRow {
  CHECK?: boolean;
  poYmd?: string;
  poSeq?: number | string;
  poSubSeq?: number | string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  qty?: number | string;
  regYmd?: string;
  emGb?: string;
  itemTp?: string;
  description?: string;
  method?: 'I' | 'U' | 'D';
}

interface FetchDetailRequest {
  form: SearchForm;
  page?: number;
  pageSize?: number;
}

function toApiParams(params: QueryParams): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

export async function fetchMmsm01001Detail({
  form,
  page = 0,
  pageSize = PAGE_SIZE,
}: FetchDetailRequest): Promise<PageResult<DetailRow>> {
  const data = await getApi<PageableResponse<DetailRow> | DetailRow[]>(
    '/api/v1/material/podet/search',
    toApiParams({
      poYmd: form.poYmd.split('-').join(''),
      cstCd: form.cstCd || '',
      itemGb: form.itemGb || '',
      page,
      pageSize,
    })
  );

  return toPageResult<DetailRow>(data, page, pageSize);
}



