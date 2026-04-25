import type { GridColumn } from '@/components/table/DataGrid';
import { formatNumber } from '@/lib/utils';

export interface SearchForm {
  ivDate: string;
  cstCd: string;
  cstNm: string;
  itemCd: string;
  itemNm: string;
}

export interface RowItem {
  ivYmd: string;
  ivSeq: number;
  inSubSeq: number;
  cstCd?: string;
  cstNm?: string;
  poYmd?: string;
  poSeq?: number;
  poSubSeq?: number;
  itemCd: string;
  itemNm: string;
  qty: number;
  price: number;
  amt: number;
  unitCd: string;
  description: string;
}

export const columns: GridColumn<RowItem>[] = [
  { dataField: 'ivYmd', caption: '입고일자', width: 120, alignment: 'center' },
  { dataField: 'ivSeq', caption: '입고순번', width: 88, alignment: 'center' },
  { dataField: 'inSubSeq', caption: '상세순번', width: 88, alignment: 'center' },
  { dataField: 'cstNm', caption: '거래처명', width: 180 },
  { dataField: 'poYmd', caption: '발주일자', width: 120, alignment: 'center' },
  { dataField: 'poSeq', caption: '발주순번', width: 88, alignment: 'center' },
  { dataField: 'poSubSeq', caption: '발주상세', width: 88, alignment: 'center' },
  { dataField: 'itemCd', caption: '원자재코드', width: 120, alignment: 'center' },
  { dataField: 'itemNm', caption: '원자재명', width: 220 },
  { dataField: 'qty', caption: '입고수량', width: 120, alignment: 'right', cellRender: (row) => formatNumber(row.qty) },
  { dataField: 'price', caption: '단가', width: 120, alignment: 'right', cellRender: (row) => formatNumber(row.price) },
  { dataField: 'amt', caption: '금액', width: 130, alignment: 'right', cellRender: (row) => formatNumber(row.amt) },
  { dataField: 'unitCd', caption: '단위', width: 90, alignment: 'center' },
  { dataField: 'description', caption: '비고', width: 260 },
];

export const exportHeaders = [
  '입고일자',
  '입고순번',
  '상세순번',
  '거래처코드',
  '거래처명',
  '발주일자',
  '발주순번',
  '발주상세순번',
  '원자재코드',
  '원자재명',
  '입고수량',
  '단가',
  '금액',
  '단위',
  '비고',
];

export const mapExportRow = (row: RowItem) => [
  row.ivYmd,
  row.ivSeq,
  row.inSubSeq,
  row.cstCd ?? '',
  row.cstNm ?? '',
  row.poYmd ?? '',
  row.poSeq ?? '',
  row.poSubSeq ?? '',
  row.itemCd,
  row.itemNm,
  row.qty,
  row.price,
  row.amt,
  row.unitCd,
  row.description ?? '',
];
