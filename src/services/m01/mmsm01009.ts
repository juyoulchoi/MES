import type { GridColumn } from '@/components/table/DataGrid';

export interface SearchForm {
  itemCd: string;
  itemNm: string;
}

export interface RowItem {
  rnum?: number | string;
  itemCd?: string;
  itemNm?: string;
  matCd?: string;
  matNm?: string;
  qty?: number | string;
  unitCd?: string;
  cstNm?: string;
  reqYmd?: string;
}

export const columns: GridColumn<RowItem>[] = [
  {
    dataField: 'rnum',
    caption: '순번',
    width: 80,
    alignment: 'center',
    cellRender: (row, index) => row.rnum ?? index + 1,
  },
  { dataField: 'itemNm', caption: '제품명', width: 260 },
  { dataField: 'matNm', caption: '원자재명', width: 260 },
  { dataField: 'cstNm', caption: '업체명', width: 180 },
  { dataField: 'reqYmd', caption: '등록일자', width: 120, alignment: 'center' },
];

export const exportHeaders = ['순번', '제품명', '원자재명', '업체명', '등록일자'];

export const mapExportRow = (row: RowItem, index: number) => [
  row.rnum ?? index + 1,
  row.itemNm ?? '',
  row.matNm ?? '',
  row.cstNm ?? '',
  row.reqYmd ?? '',
];
