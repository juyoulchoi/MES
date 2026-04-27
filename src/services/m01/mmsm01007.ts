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
    caption: '기초재고',
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
  '기준일자',
  '원자재코드',
  '원자재명',
  '현재고',
  '단위',
  '기초재고',
  '입고수량',
  '출고수량',
  '기말재고',
];

export const mapExportRow = (row: RowItem) => [
  row.ymd ?? '',
  row.itemCd,
  row.itemNm ?? '',
  row.qty ?? 0,
  row.unitCd ?? '',
  row.stStk ?? 0,
  row.inStk ?? 0,
  row.outStk ?? 0,
  row.endStk ?? 0,
];
