import { getApi } from '@/lib/axiosClient';
import { PAGE_SIZE, toPageResult, type PageResult, type PageableResponse } from '@/lib/pagination';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

type DetailApiRow = DetailRow & Record<string, unknown>;

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return undefined;
}

function normalizeDateInputValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  return trimmed;
}

function pickNumberLike(source: Record<string, unknown>, keys: string[]): number | string | undefined {
  const value = pickString(source, keys);
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.replace(/,/g, '');
  const numeric = Number(normalized);
  return Number.isNaN(numeric) ? value : numeric;
}

function normalizeDetailRow(row: DetailApiRow): DetailRow {
  return {
    ...row,
    poYmd: pickString(row, ['poYmd', 'PO_YMD']) ?? row.poYmd,
    poSeq: pickString(row, ['poSeq', 'PO_SEQ']) ?? row.poSeq,
    poSubSeq: pickString(row, ['poSubSeq', 'PO_SUB_SEQ']) ?? row.poSubSeq,
    itemCd: pickString(row, ['itemCd', 'ITEM_CD']) ?? row.itemCd,
    itemNm: pickString(row, ['itemNm', 'ITEM_NM']) ?? row.itemNm,
    unitCd: pickString(row, ['unitCd', 'UNIT_CD']) ?? row.unitCd,
    qty: pickString(row, ['qty', 'QTY']) ?? row.qty,
    price:
      pickNumberLike(row, [
        'price',
        'poPrice',
        'unitPrice',
        'purPrice',
        'PRICE',
        'PO_PRICE',
        'UNIT_PRICE',
        'PUR_PRICE',
      ]) ?? row.price,
    amt:
      pickNumberLike(row, ['amt', 'poAmt', 'totAmt', 'AMT', 'PO_AMT', 'TOT_AMT']) ?? row.amt,
    reqYmd: normalizeDateInputValue(
      pickString(row, ['reqYmd', 'regYmd', 'REQ_YMD', 'REG_YMD']) ?? row.reqYmd
    ),
    emGb: pickString(row, ['emGb', 'EM_GB']) ?? row.emGb,
    itemTp: pickString(row, ['itemTp', 'ITEM_TP']) ?? row.itemTp,
    description: pickString(row, ['description', 'desc', 'DESC']) ?? row.description,
  };
}

export interface SearchForm {
  poYmd: string;
  cstCd: string;
  itemGb: string;
  poSeq?: string;
}

export interface MasterRow {
  CHECK?: boolean;
  cstNm?: string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  qty?: number | string;
  price?: number | string;
  amt?: number | string;
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
  price?: number | string;
  amt?: number | string;
  reqYmd?: string;
  emGb?: string;
  itemTp?: string;
  description?: string;
  method?: 'I' | 'U' | 'D';
}

export interface SaveDetailRow {
  method: 'I' | 'U' | 'D';
  poYmd: string;
  poSeq: string;
  poSubSeq: number | string;
  reqYmd: string;
  emGb: string;
  desc: string;
  itemCd: string;
  unitCd: string;
  qty: number | string;
  price?: number | string;
  amt?: number | string;
}

export interface SaveMasterRow {
  method: 'I' | 'D';
  userId: string;
  cstCd: string;
  poYmd: string;
  poSeq: string;
  desc: string;
}

export interface SavePayload {
  masterData: SaveMasterRow[];
  detailData: SaveDetailRow[];
}

export interface AuthMeResponse {
  user?: {
    userid?: string;
    userId?: string;
  };
  data?: {
    user?: {
      userid?: string;
      userId?: string;
    };
  };
}

export interface ExcelUploadRow {
  itemCd: string;
  itemNm?: string;
  unitCd?: string;
  qty: number | string;
  price?: number | string;
  amt?: number | string;
  desc?: string;
}

export interface ExcelValidateResponse {
  validRows?: ExcelUploadRow[];
  errors?: Array<{
    rowNo: number;
    field?: string;
    message: string;
  }>;
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
  const data = await getApi<PageableResponse<DetailApiRow> | DetailApiRow[]>(
    '/api/v1/material/podet/search',
    toApiParams({
      poYmd: form.poYmd.split('-').join(''),
      cstCd: form.cstCd || '',
      itemGb: form.itemGb || '',
      page,
      pageSize,
    })
  );

  const pageResult = toPageResult<DetailApiRow>(data, page, pageSize);

  return {
    ...pageResult,
    content: pageResult.content.map((row) => normalizeDetailRow(row)),
  };
}
