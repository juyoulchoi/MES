import { getApi } from '@/lib/axiosClient';
import { PAGE_SIZE, toPageResult, type PageResult, type PageableResponse } from '@/lib/pagination';
import { calculateAmount } from '@/pages/M01/registerDetailShared';

type ApiRow = Record<string, unknown>;
const SALES_ITEM_GB = 'FG,SFG';

export interface SearchForm {
  soYmd: string;
  seq: string;
  cstCd: string;
}

export interface MasterRow {
  CHECK?: boolean;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  price?: string | number;
}

export interface DetailRow {
  CHECK?: boolean;
  soYmd?: string;
  soSeq?: string | number;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  qty?: string | number;
  price?: string | number;
  amt?: string | number;
  reqYmd?: string;
  emGb?: string;
  description?: string;
  soSubSeq?: string | number;
  endYn?: string;
  salTp?: string;
  method?: 'I' | 'U' | 'D';
}

interface BuildSavePayloadRequest {
  form: SearchForm;
  detailRows: DetailRow[];
  deletedDetailRows?: DetailRow[];
  userId: string;
}

interface PageFetchRequest {
  form: SearchForm;
  page?: number;
  pageSize?: number;
}

export interface SaveMasterRow {
  method: 'I' | 'D';
  userId: string;
  cstCd: string;
  soYmd: string;
  soSeq: string;
  desc: string;
}

export interface SaveDetailRow {
  method: 'I' | 'U' | 'D';
  soYmd: string;
  soSeq: string;
  soSubSeq: string | number;
  reqYmd: string;
  emGb: string;
  desc: string;
  itemCd: string;
  unitCd: string;
  qty: string | number;
  price?: string | number;
  amt?: string | number;
  endYn: string;
  salTp: string;
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

function toStringValue(value: unknown) {
  return value === undefined || value === null ? '' : String(value);
}

function pickString(row: ApiRow, key: string) {
  return toStringValue(row[key]);
}

function normalizeDateInputValue(value?: string) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
  }

  return trimmed;
}

export function toApiYmd(value: string) {
  return value.split('-').join('');
}

export function normalizeMasterRow(row: ApiRow): MasterRow {
  return {
    itemCd: pickString(row, 'itemCd'),
    itemNm: pickString(row, 'itemNm'),
    unitCd: pickString(row, 'unitCd'),
    price: pickString(row, 'unitPrice'),
  };
}

export function normalizeDetailRow(row: ApiRow): DetailRow {
  return {
    soYmd: pickString(row, 'soYmd'),
    soSeq: pickString(row, 'soSeq'),
    soSubSeq: pickString(row, 'soSubSeq'),
    itemCd: pickString(row, 'itemCd'),
    itemNm: pickString(row, 'itemNm'),
    unitCd: pickString(row, 'unitCd'),
    qty: pickString(row, 'qty'),
    price: pickString(row, 'soPrice') || pickString(row, 'unitPrice'),
    amt: pickString(row, 'soAmt') || pickString(row, 'totalPrice'),
    reqYmd: normalizeDateInputValue(pickString(row, 'reqYmd')),
    emGb: pickString(row, 'emGb'),
    description: pickString(row, 'description'),
    endYn: pickString(row, 'endYn'),
    salTp: pickString(row, 'salTp'),
    method: 'U',
  };
}

export async function fetchMmsm02001Master({
  form,
  page = 0,
  pageSize = PAGE_SIZE,
}: PageFetchRequest): Promise<PageResult<MasterRow>> {
  const data = await getApi<PageableResponse<ApiRow> | ApiRow[]>(
    '/api/v1/mdm/item/searchItemCustList',
    {
      itemGb: SALES_ITEM_GB,
      cstCd: form.cstCd || '',
      page: String(page),
      size: String(pageSize),
    }
  );
  const result = toPageResult<ApiRow>(data, page, pageSize);
  return {
    ...result,
    content: result.content.map(normalizeMasterRow),
  };
}

export async function fetchMmsm02001Detail({
  form,
  page = 0,
  pageSize = PAGE_SIZE,
}: PageFetchRequest): Promise<PageResult<DetailRow>> {
  const data = await getApi<ApiRow[]>('/api/v1/sales/searchSoDetailList', {
    soYmd: toApiYmd(form.soYmd),
    cstCd: form.cstCd || '',
  });
  const rows = (Array.isArray(data) ? data : []).map(normalizeDetailRow);
  return toPageResult<DetailRow>(rows, page, pageSize);
}

export function getNextDetailSubSeq(rows: DetailRow[]) {
  return rows.reduce((max, row) => {
    const seq = Number(row.soSubSeq) || 0;
    return Math.max(max, seq);
  }, 0);
}

export function buildMmsm02001SavePayload({
  form,
  detailRows,
  deletedDetailRows = [],
  userId,
}: BuildSavePayloadRequest): SavePayload {
  const deletedRowKeySet = new Set(
    deletedDetailRows
      .map((row) => [row.soYmd ?? '', row.soSeq ?? '', row.soSubSeq ?? ''].join('|'))
      .filter((key) => key !== '||')
  );

  const insertedDetailData: SaveDetailRow[] = detailRows
    .filter((row) => (row.method ?? (row.soYmd && row.soSeq !== undefined ? 'U' : 'I')) === 'I')
    .map((row) => ({
      method: 'I',
      soYmd: '',
      soSeq: '',
      soSubSeq: '',
      reqYmd: toApiYmd(row.reqYmd ?? form.soYmd),
      emGb: row.emGb ?? '',
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
      price: row.price ?? '',
      amt: calculateAmount(row.qty, row.price),
      endYn: row.endYn || 'N',
      salTp: row.salTp || 'RETAIL',
    }));

  const updatedDetailData: SaveDetailRow[] = detailRows
    .filter(
      (row) =>
        !deletedRowKeySet.has([row.soYmd ?? '', row.soSeq ?? '', row.soSubSeq ?? ''].join('|'))
    )
    .filter((row) => (row.method ?? (row.soYmd && row.soSeq !== undefined ? 'U' : 'I')) === 'U')
    .map((row, index) => ({
      method: 'U',
      soYmd: row.soYmd ?? '',
      soSeq: row.soSeq === undefined || row.soSeq === null ? '' : String(row.soSeq),
      soSubSeq: row.soSubSeq ?? index + 1,
      reqYmd: toApiYmd(row.reqYmd ?? form.soYmd),
      emGb: row.emGb ?? '',
      desc: row.description ?? '',
      itemCd: row.itemCd ?? '',
      unitCd: row.unitCd ?? '',
      qty: row.qty ?? '',
      price: row.price ?? '',
      amt: calculateAmount(row.qty, row.price),
      endYn: row.endYn || 'N',
      salTp: row.salTp || 'RETAIL',
    }));

  const deletedData: SaveDetailRow[] = deletedDetailRows.map((row, index) => ({
    method: 'D',
    soYmd: row.soYmd ?? '',
    soSeq: row.soSeq === undefined || row.soSeq === null ? '' : String(row.soSeq),
    soSubSeq: row.soSubSeq ?? index + 1,
    itemCd: row.itemCd ?? '',
    unitCd: row.unitCd ?? '',
    qty: row.qty ?? '',
    reqYmd: toApiYmd(row.reqYmd ?? form.soYmd),
    emGb: row.emGb ?? '',
    desc: row.description ?? '',
    price: row.price ?? '',
    amt: calculateAmount(row.qty, row.price),
    endYn: row.endYn || 'N',
    salTp: row.salTp || 'RETAIL',
  }));

  const deleteTarget = deletedDetailRows.find(
    (row) => row.soYmd && row.soSeq !== undefined && row.soSeq !== null
  );
  const shouldDeleteMaster = detailRows.length === 0 && !!deleteTarget;

  return {
    masterData: [
      {
        method: shouldDeleteMaster ? 'D' : 'I',
        userId,
        cstCd: form.cstCd,
        soYmd: shouldDeleteMaster ? String(deleteTarget?.soYmd ?? '') : toApiYmd(form.soYmd),
        soSeq:
          shouldDeleteMaster && deleteTarget?.soSeq !== undefined && deleteTarget.soSeq !== null
            ? String(deleteTarget.soSeq)
            : '',
        desc: '',
      },
    ],
    detailData: [...insertedDetailData, ...updatedDetailData, ...deletedData],
  };
}


export function buildMmsm02001PlanPayload(form: SearchForm) {
  return [{ SO_YMD: toApiYmd(form.soYmd), SEQ: form.seq || '', CST_CD: form.cstCd || '' }];
}
