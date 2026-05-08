import type { GridColumn } from '@/components/table/DataGrid';
import { toYmd } from '@/lib/excel';
import { formatNumber } from '@/lib/utils';

export { toYmd };

export interface SearchForm {
  startDate: string;
  endDate: string;
  proc: string;
}

export interface RowItem {
  rnum?: number | string;
  workYmd?: string;
  procNm?: string;
  itemNm?: string;
  cstNm?: string;
  planQty?: number | string;
  prdQty?: number | string;
}

export interface ApiRow extends RowItem {
  RNUM?: number | string;
  REQ_YMD?: string;
  LINE_NM?: string;
  ITEM_NM?: string;
  CST_NM?: string;
  PRD_QTY?: number | string;
  QTY?: number | string;
  [key: string]: unknown;
}

export function normalizeRows(rows: ApiRow[]): RowItem[] {
  return rows.map((row, index) => ({
    ...row,
    rnum: row.rnum ?? row.RNUM ?? index + 1,
    workYmd: row.workYmd ?? row.REQ_YMD ?? '',
    procNm: row.procNm ?? row.LINE_NM ?? '',
    itemNm: row.itemNm ?? row.ITEM_NM ?? '',
    cstNm: row.cstNm ?? row.CST_NM ?? '',
    planQty: row.planQty ?? row.PRD_QTY ?? '',
    prdQty: row.prdQty ?? row.QTY ?? '',
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
  { dataField: 'workYmd', caption: '작업일자', width: 120, alignment: 'center' },
  { dataField: 'procNm', caption: '공정', width: 180 },
  { dataField: 'itemNm', caption: '제품명', width: 220 },
  { dataField: 'cstNm', caption: '거래처명', width: 180 },
  {
    dataField: 'planQty',
    caption: '계획수량',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.planQty ?? 0),
  },
  {
    dataField: 'prdQty',
    caption: '생산수량',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.prdQty ?? 0),
  },
];

export const exportHeaders = [
  '순번',
  '작업일자',
  '공정',
  '제품명',
  '거래처명',
  '계획수량',
  '생산수량',
];

export const mapExportRow = (row: RowItem, index: number) => [
  row.rnum ?? index + 1,
  row.workYmd ?? '',
  row.procNm ?? '',
  row.itemNm ?? '',
  row.cstNm ?? '',
  row.planQty ?? '',
  row.prdQty ?? '',
];
