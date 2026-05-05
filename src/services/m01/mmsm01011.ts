import type { GridColumn } from '@/components/table/DataGrid';
import { formatNumber } from '@/lib/utils';

export interface SearchForm {
  startDate: string;
  endDate: string;
}

export interface RowItem {
  rnum?: number | string;
  itemCd?: string;
  itemNm?: string;
  qty?: number | string;
  unitCd?: string;
  ymd?: string;
  stStk?: number | string;
  inStk?: number | string;
  outStk?: number | string;
  endStk?: number | string;
  description?: string;
}

export interface ApiRow extends RowItem {
  [key: string]: unknown;
}

export function toYmd(value: string) {
  return value.split('-').join('');
}

export function normalizeRows(rows: ApiRow[]): RowItem[] {
  return rows.map((row, index) => ({
    ...row,
    ...(row.rnum ? {} : { rnum: index + 1 }),
  }));
}

export const columns: GridColumn<RowItem>[] = [
  {
    dataField: 'rnum',
    caption: '순번',
    width: 80,
    alignment: 'center',
    cellRender: (row, index) => row.rnum ?? index + 1,
  },
  { dataField: 'ymd', caption: '실사일자', width: 120, alignment: 'center' },
  { dataField: 'itemCd', caption: '원자재코드', width: 130, alignment: 'center' },
  { dataField: 'itemNm', caption: '원자재명', width: 240 },
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
  {
    dataField: 'endStk',
    caption: '기말재고',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.endStk ?? 0),
  },
];

export const exportHeaders = [
  '순번',
  '실사일자',
  '원자재코드',
  '원자재명',
  '현재고',
  '단위',
  '재고증감',
  '입고수량',
  '출고수량',
  '기말재고',
];

export const mapExportRow = (row: RowItem, index: number) => [
  row.rnum ?? index + 1,
  row.ymd ?? '',
  row.itemCd ?? '',
  row.itemNm ?? '',
  row.qty ?? '',
  row.unitCd ?? '',
  row.stStk ?? '',
  row.inStk ?? '',
  row.outStk ?? '',
  row.endStk ?? '',
];
