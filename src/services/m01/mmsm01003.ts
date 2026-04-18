import { getApi } from '@/lib/axiosClient';
import { PAGE_SIZE, toPageResult, type PageResult, type PageableResponse } from '@/lib/pagination';
import { toYmd } from '@/lib/excel';

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

function toApiParams(params: QueryParams): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

export interface SearchForm {
  ivDate: string;
  cstCd: string;
}

export interface DetailRow {
  CHECK?: boolean;
  ivYmd?: string;
  ivSeq?: number | string;
  ivSubSeq?: number | string;
  poYmd?: string;
  poSeq?: number | string;
  poSubSeq?: number | string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  qty?: number | string;
  description?: string;
  method?: 'I' | 'U' | 'D';
}

export interface SaveDetailRow {
  method: 'I' | 'U' | 'D';
  ivYmd: string;
  ivSeq: string;
  ivSubSeq: number | string;
  desc: string;
  itemCd: string;
  unitCd: string;
  qty: number | string;
}

export interface SaveMasterRow {
  method: 'I' | 'D';
  userId: string;
  cstCd: string;
  ivYmd: string;
  ivSeq: string;
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
    ivYmd: pickString(source, ['ivYmd', 'IV_YMD']) ?? detailRow.ivYmd ?? detailRow.poYmd,
    ivSeq: pickString(source, ['ivSeq', 'IV_SEQ']) ?? detailRow.ivSeq ?? detailRow.poSeq,
    ivSubSeq: pickString(source, ['ivSubSeq', 'IV_SUB_SEQ', 'inSubSeq', 'IN_SUB_SEQ']) ?? detailRow.ivSubSeq ?? detailRow.poSubSeq,
    poYmd: pickString(source, ['poYmd', 'PO_YMD']) ?? detailRow.poYmd ?? detailRow.ivYmd,
    poSeq: pickString(source, ['poSeq', 'PO_SEQ']) ?? detailRow.poSeq ?? detailRow.ivSeq,
    poSubSeq: pickString(source, ['poSubSeq', 'PO_SUB_SEQ']) ?? detailRow.poSubSeq ?? detailRow.ivSubSeq,
    itemCd: pickString(source, ['itemCd', 'ITEM_CD']) ?? detailRow.itemCd,
    itemNm: pickString(source, ['itemNm', 'ITEM_NM']) ?? detailRow.itemNm,
    unitCd: pickString(source, ['unitCd', 'UNIT_CD']) ?? detailRow.unitCd,
    qty: pickString(source, ['qty', 'QTY']) ?? detailRow.qty,
    description: pickString(source, ['description', 'desc', 'DESC']) ?? detailRow.description,
  };
}

export function getDetailRowKey(row: DetailRow) {
  const normalized = normalizeDetailRow(row);
  return [normalized.ivYmd ?? '', normalized.ivSeq ?? '', normalized.ivSubSeq ?? ''].join('|');
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
    const seq = Number(row.ivSubSeq ?? row.poSubSeq) || 0;
    return Math.max(max, seq);
  }, 0);
}

export function createUploadedDetailRows(rows: ExcelUploadRow[]): DetailRow[] {
  return rows.map((row, index) => ({
    CHECK: true,
    method: 'I' as const,
    ivSubSeq: index + 1,
    itemCd: row.itemCd ?? '',
    itemNm: row.itemNm ?? '',
    unitCd: row.unitCd ?? '',
    qty: row.qty ?? '',
    description: row.desc ?? '',
  }));
}

export async function fetchMmsm01003Detail({
  form,
  page = 0,
  pageSize = PAGE_SIZE,
}: FetchDetailRequest): Promise<PageResult<DetailRow>> {
  const data = await getApi<PageableResponse<Record<string, unknown>> | Record<string, unknown>[]>(
    '/api/v1/material/ivdet/search',
    toApiParams({
      ivYmd: form.ivDate.split('-').join(''),
      cstCd: form.cstCd || '',
      page,
      pageSize,
    })
  );

  const pageResult = toPageResult<Record<string, unknown>>(data, page, pageSize);

  return {
    ...pageResult,
    content: pageResult.content.map((row) => normalizeDetailRow(row)),
  };
}

export function buildMmsm01003SavePayload({
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
    .filter((row) => (row.method ?? (row.ivYmd && row.ivSeq !== undefined ? 'U' : 'I')) === 'I')
    .map((row) => ({
      method: 'I',
      ivYmd: row.ivYmd ?? '',
      ivSeq: row.ivSeq === undefined || row.ivSeq === null ? '' : String(row.ivSeq),
      ivSubSeq: '',
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
    }));

  const updatedDetailData: SaveDetailRow[] = detailRows
    .map((row) => normalizeDetailRow(row))
    .filter((row) => !deletedRowKeySet.has(getDetailRowKey(row)))
    .filter((row) => (row.method ?? (row.ivYmd && row.ivSeq !== undefined ? 'U' : 'I')) === 'U')
    .map((row, index) => ({
      method: 'U',
      ivYmd: row.ivYmd ?? '',
      ivSeq: row.ivSeq === undefined || row.ivSeq === null ? '' : String(row.ivSeq),
      ivSubSeq: row.ivSubSeq ?? index + 1,
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
    }));

  const deletedData: SaveDetailRow[] = deletedRows.map((currentRow, index) => {
    const row = normalizeDetailRow(currentRow);

    return {
      method: 'D',
      ivYmd: row.ivYmd ?? '',
      ivSeq: row.ivSeq === undefined || row.ivSeq === null ? '' : String(row.ivSeq),
      ivSubSeq: row.ivSubSeq ?? index + 1,
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
    };
  });

  const deleteTarget = deletedRows.find((row) => row.ivYmd && row.ivSeq !== undefined && row.ivSeq !== null);
  const shouldDeleteMaster = detailRows.length === 0 && !!deleteTarget;

  const masterData: SaveMasterRow[] = [
    {
      method: shouldDeleteMaster ? 'D' : 'I',
      userId,
      cstCd: form.cstCd || '',
      ivYmd: shouldDeleteMaster ? String(deleteTarget?.ivYmd ?? '') : toYmd(form.ivDate),
      ivSeq:
        shouldDeleteMaster && deleteTarget?.ivSeq !== undefined && deleteTarget.ivSeq !== null
          ? String(deleteTarget.ivSeq)
          : '',
      desc: '',
    },
  ];

  return {
    masterData,
    detailData: [...insertedDetailData, ...updatedDetailData, ...deletedData],
  };
}
