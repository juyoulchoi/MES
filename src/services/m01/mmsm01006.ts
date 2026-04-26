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
  giYmd: string;
  giSeq: number;
  giSubSeq: number;
  itemCd: string;
  itemNm?: string;
  qty: number;
  unitCd: string;
  description?: string;
}

export const columns: GridColumn<RowItem>[] = [
  { dataField: 'giYmd', caption: '출고일자', width: 120, alignment: 'center' },
  { dataField: 'giSeq', caption: '출고순번', width: 88, alignment: 'center' },
  { dataField: 'giSubSeq', caption: '상세순번', width: 88, alignment: 'center' },
  { dataField: 'itemCd', caption: '원자재코드', width: 120, alignment: 'center' },
  { dataField: 'itemNm', caption: '원자재명', width: 220 },
  {
    dataField: 'qty',
    caption: '출고수량',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.qty),
  },
  { dataField: 'unitCd', caption: '단위', width: 90, alignment: 'center' },
  { dataField: 'description', caption: '비고', width: 260 },
];

export const exportHeaders = [
  '출고일자',
  '출고순번',
  '상세순번',
  '원자재코드',
  '원자재명',
  '출고수량',
  '단위',
  '비고',
];

export const mapExportRow = (row: RowItem) => [
  row.giYmd,
  row.giSeq,
  row.giSubSeq,
  row.itemCd,
  row.itemNm ?? '',
  row.qty,
  row.unitCd,
  row.description ?? '',
];
