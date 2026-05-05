import type { GridColumn } from '@/components/table/DataGrid';
import { formatNumber } from '@/lib/utils';

export interface SearchForm {
  startDate: string;
  endDate: string;
  cstCd: string;
  cstNm: string;
  itemCd: string;
  itemNm: string;
}

export interface RowItem {
  rnum?: number | string;
  itemCd: string;
  itemNm?: string;
  qty?: number;
  unitCd?: string;
  ymd?: string;
  stStk?: number;
  inStk?: number;
  outStk?: number;
  endStk?: number;
}

export const columns: GridColumn<RowItem>[] = [
  { dataField: 'rnum', caption: '순번', width: 80, alignment: 'center', cellRender: (row, index) => row.rnum ?? index + 1 },
  { dataField: 'ymd', caption: '기준일자', width: 120, alignment: 'center' },
  { dataField: 'itemCd', caption: '원자재코드', width: 120, alignment: 'center' },
  { dataField: 'itemNm', caption: '원자재명', width: 220 },
  {
    dataField: 'qty',
    caption: '현재고',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.qty ?? 0),
  },
  { dataField: 'unitCd', caption: '단위', width: 90, alignment: 'center' },
  {
    dataField: 'stStk',
    caption: '재고증감',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.stStk ?? 0),
  },
  {
    dataField: 'inStk',
    caption: '입고수량',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.inStk ?? 0),
  },
  {
    dataField: 'outStk',
    caption: '출고수량',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.outStk ?? 0),
  },
];

export const exportHeaders = [
  '순번',
  '기준일자',
  '원자재코드',
  '원자재명',
  '현재고',
  '단위',
  '재고증감',
  '입고수량',
  '출고수량',
];

export const mapExportRow = (row: RowItem, index: number) => [
  row.rnum ?? index + 1,
  row.ymd ?? '',
  row.itemCd,
  row.itemNm ?? '',
  row.qty ?? 0,
  row.unitCd ?? '',
  row.stStk ?? 0,
  row.inStk ?? 0,
  row.outStk ?? 0,
];

function compareYmdDesc(a?: string, b?: string) {
  return String(b ?? '').localeCompare(String(a ?? ''));
}

function toNumber(value: number | string | undefined) {
  const numeric = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function getLatestRowsByItem(rows: RowItem[]) {
  const latestByItem = new Map<string, RowItem>();

  rows.forEach((row) => {
    const key = row.itemCd;
    const current = latestByItem.get(key);

    if (!current) {
      latestByItem.set(key, {
        ...row,
        stStk: toNumber(row.stStk),
        inStk: toNumber(row.inStk),
        outStk: toNumber(row.outStk),
      });
      return;
    }

    const latest = compareYmdDesc(current.ymd, row.ymd) > 0 ? row : current;
    latestByItem.set(key, {
      ...latest,
      stStk: toNumber(current.stStk) + toNumber(row.stStk),
      inStk: toNumber(current.inStk) + toNumber(row.inStk),
      outStk: toNumber(current.outStk) + toNumber(row.outStk),
    });
  });

  return Array.from(latestByItem.values()).sort((a, b) => {
    const ymdOrder = compareYmdDesc(a.ymd, b.ymd);
    if (ymdOrder !== 0) return ymdOrder;
    return String(a.itemCd ?? '').localeCompare(String(b.itemCd ?? ''));
  });
}
