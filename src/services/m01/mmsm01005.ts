import { getApi } from '@/lib/axiosClient';
import { toYmd } from '@/lib/excel';
import { PAGE_SIZE, toPageResult, type PageResult, type PageableResponse } from '@/lib/pagination';
import { calculateAmount } from '@/pages/M01/registerDetailShared';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

function pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }

  return undefined;
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

function toApiParams(params: QueryParams): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

export interface SearchForm {
  giDate: string;
  cstCd: string;
}

export interface DetailRow {
  CHECK?: boolean;
  giYmd?: string;
  giSeq?: number | string;
  giSubSeq?: number | string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  qty?: number | string;
  price?: number | string;
  amt?: number | string;
  description?: string;
  method?: 'I' | 'U' | 'D';
}

export interface SaveDetailRow {
  method: 'I' | 'U' | 'D';
  giYmd: string;
  giSeq: string;
  giSubSeq: number | string;
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
  giYmd: string;
  giSeq: string;
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

interface BuildSavePayloadRequest {
  form: SearchForm;
  detailRows: DetailRow[];
  deletedDetailRows: DetailRow[];
  userId: string;
}

export function normalizeDetailRow(row: DetailRow | Record<string, unknown>): DetailRow {
  const source = row as Record<string, unknown>;
  const detailRow = row as DetailRow;

  return {
    ...detailRow,
    giYmd: pickString(source, ['giYmd', 'GI_YMD']) ?? detailRow.giYmd,
    giSeq: pickString(source, ['giSeq', 'GI_SEQ']) ?? detailRow.giSeq,
    giSubSeq:
      pickString(source, ['giSubSeq', 'GI_SUB_SEQ', 'outSubSeq', 'OUT_SUB_SEQ']) ??
      detailRow.giSubSeq,
    itemCd: pickString(source, ['itemCd', 'ITEM_CD']) ?? detailRow.itemCd,
    itemNm: pickString(source, ['itemNm', 'ITEM_NM']) ?? detailRow.itemNm,
    unitCd: pickString(source, ['unitCd', 'UNIT_CD']) ?? detailRow.unitCd,
    qty: pickString(source, ['qty', 'QTY']) ?? detailRow.qty,
    price:
      pickNumberLike(source, ['price', 'giPrice', 'unitPrice', 'PRICE', 'GI_PRICE', 'UNIT_PRICE']) ??
      detailRow.price,
    amt: pickNumberLike(source, ['amt', 'giAmt', 'totAmt', 'AMT', 'GI_AMT', 'TOT_AMT']) ?? detailRow.amt,
    description: pickString(source, ['description', 'desc', 'DESC']) ?? detailRow.description,
  };
}

export function getDetailRowKey(row: DetailRow) {
  const normalized = normalizeDetailRow(row);
  return [normalized.giYmd ?? '', normalized.giSeq ?? '', normalized.giSubSeq ?? ''].join('|');
}

export function dedupeDetailRows(rows: DetailRow[]) {
  const map = new Map<string, DetailRow>();

  rows.forEach((row) => {
    map.set(getDetailRowKey(row), normalizeDetailRow(row));
  });

  return Array.from(map.values());
}

export function getNextDetailSubSeq(rows: DetailRow[]) {
  return rows.reduce((max, row) => {
    const seq = Number(row.giSubSeq) || 0;
    return Math.max(max, seq);
  }, 0);
}

export function createUploadedDetailRows(rows: ExcelUploadRow[]): DetailRow[] {
  return rows.map((row, index) => ({
    CHECK: true,
    method: 'I' as const,
    giSubSeq: index + 1,
    itemCd: row.itemCd ?? '',
    itemNm: row.itemNm ?? '',
    unitCd: row.unitCd ?? '',
    qty: row.qty ?? '',
    price: row.price ?? '',
    amt: row.amt ?? '',
    description: row.desc ?? '',
  }));
}

export async function fetchMmsm01005Detail({
  form,
  page = 0,
  pageSize = PAGE_SIZE,
}: FetchDetailRequest): Promise<PageResult<DetailRow>> {
  const data = await getApi<PageableResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    '/api/v1/material/gidet/search',
    toApiParams({
      giYmd: form.giDate.split('-').join(''),
      cstCd: form.cstCd || undefined,
      page,
      size: pageSize,
    })
  );

  const pageResult = toPageResult<Record<string, unknown>>(data, page, pageSize);

  return {
    ...pageResult,
    content: pageResult.content.map((row) => normalizeDetailRow(row)),
  };
}

export function buildMmsm01005SavePayload({
  form,
  detailRows,
  deletedDetailRows,
  userId,
}: BuildSavePayloadRequest): SavePayload {
  const deletedRows = dedupeDetailRows(deletedDetailRows);
  const deletedRowKeySet = new Set(
    deletedRows.map((row) => getDetailRowKey(row)).filter((key) => key !== '||')
  );

  const insertedDetailData: SaveDetailRow[] = detailRows
    .map((row) => normalizeDetailRow(row))
    .filter((row) => (row.method ?? (row.giYmd && row.giSeq !== undefined ? 'U' : 'I')) === 'I')
    .map((row) => ({
      method: 'I',
      giYmd: row.giYmd ?? '',
      giSeq: row.giSeq === undefined || row.giSeq === null ? '' : String(row.giSeq),
      giSubSeq: '',
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
      price: row.price ?? '',
      amt: calculateAmount(row.qty, row.price),
    }));

  const updatedDetailData: SaveDetailRow[] = detailRows
    .map((row) => normalizeDetailRow(row))
    .filter((row) => !deletedRowKeySet.has(getDetailRowKey(row)))
    .filter((row) => (row.method ?? (row.giYmd && row.giSeq !== undefined ? 'U' : 'I')) === 'U')
    .map((row, index) => ({
      method: 'U',
      giYmd: row.giYmd ?? '',
      giSeq: row.giSeq === undefined || row.giSeq === null ? '' : String(row.giSeq),
      giSubSeq: row.giSubSeq ?? index + 1,
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
      price: row.price ?? '',
      amt: calculateAmount(row.qty, row.price),
    }));

  const deletedData: SaveDetailRow[] = deletedRows.map((currentRow, index) => {
    const row = normalizeDetailRow(currentRow);

    return {
      method: 'D',
      giYmd: row.giYmd ?? '',
      giSeq: row.giSeq === undefined || row.giSeq === null ? '' : String(row.giSeq),
      giSubSeq: row.giSubSeq ?? index + 1,
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
      price: row.price ?? '',
      amt: calculateAmount(row.qty, row.price),
    };
  });

  const deleteTarget = deletedRows.find((row) => row.giYmd && row.giSeq !== undefined && row.giSeq !== null);
  const shouldDeleteMaster = detailRows.length === 0 && !!deleteTarget;

  const masterData: SaveMasterRow[] = [
    {
      method: shouldDeleteMaster ? 'D' : 'I',
      userId,
      cstCd: form.cstCd || '',
      giYmd: shouldDeleteMaster ? String(deleteTarget?.giYmd ?? '') : toYmd(form.giDate),
      giSeq:
        shouldDeleteMaster && deleteTarget?.giSeq !== undefined && deleteTarget.giSeq !== null
          ? String(deleteTarget.giSeq)
          : '',
      desc: '',
    },
  ];

  return {
    masterData,
    detailData: [...insertedDetailData, ...updatedDetailData, ...deletedData],
  };
}
