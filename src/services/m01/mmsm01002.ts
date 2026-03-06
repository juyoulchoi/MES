import { getApi } from '@/lib/axiosClient';
import { MathGb } from '@/lib/types';
import { type BaseTableClassNames, type TableColumn } from '@/components/table/BaseTable';

export interface SearchForm {
  startDate: string;
  endDate: string;
  cstCd: string;
  cstNm: string;
  itemCd: string;
  itemNm: string;
  mathGb: MathGb;
}

export interface RowItem {
  RNUM: number;
  PO_NO: string;
  PO_YMD: string;
  ITEM_GB: string;
  ITEM_NM: string;
  ITEM_TP: string;
  STANDARD: string;
  REQ_YMD: string;
  IV_YMD: string;
  PO_QTY: number;
  PRE_IV_QTY: number;
  IV_QTY: number;
}

export const columns: TableColumn<RowItem>[] = [
  { key: 'RNUM', header: '순번', width: 80, align: 'center', accessor: 'RNUM' },
  {
    key: 'PO_NO',
    header: '발주번호',
    width: 0,
    accessor: 'PO_NO',
    headerClassName: 'hidden',
    cellClassName: 'hidden',
  },
  { key: 'PO_YMD', header: '발주일자', width: 100, align: 'center', accessor: 'PO_YMD' },
  { key: 'ITEM_GB', header: '원자재구분', width: 100, align: 'center', accessor: 'ITEM_GB' },
  { key: 'ITEM_NM', header: '원자재명', width: 160, accessor: 'ITEM_NM' },
  { key: 'ITEM_TP', header: '종류', width: 120, accessor: 'ITEM_TP' },
  { key: 'STANDARD', header: '규격', width: 120, align: 'center', accessor: 'STANDARD' },
  { key: 'REQ_YMD', header: '입고요청일', width: 120, align: 'center', accessor: 'REQ_YMD' },
  { key: 'IV_YMD', header: '입고일', width: 120, align: 'center', accessor: 'IV_YMD' },
  {
    key: 'PO_QTY',
    header: '발주량',
    width: 100,
    align: 'right',
    accessor: (row) => row.PO_QTY.toLocaleString(),
  },
  {
    key: 'PRE_IV_QTY',
    header: '기입고량',
    width: 100,
    align: 'right',
    accessor: (row) => row.PRE_IV_QTY.toLocaleString(),
  },
  {
    key: 'IV_QTY',
    header: '입고량',
    width: 100,
    align: 'right',
    accessor: (row) => row.IV_QTY.toLocaleString(),
  },
];

export const tableClassNames: BaseTableClassNames = {
  table: 'min-w-[1000px] w-full text-sm',
  thead: 'sticky top-0 bg-gray-100 z-10',
  headerCell: 'py-2 px-2 text-gray-700 text-xs font-semibold border-b',
  bodyRow: 'border-b last:border-b-0 hover:bg-gray-50',
  bodyCell: 'py-2 px-2',
  emptyCell: 'py-10 text-center text-gray-400',
};

export const rows: RowItem[] = [];

function toYmd(date: string): string {
  const trimmed = date?.trim();
  if (!trimmed) return '';
  return trimmed.replace(/-/g, '');
}
export const exportHeaders = [
  '순번',
  '발주번호',
  '발주일자',
  '원자재구분',
  '원자재명',
  '종류',
  '규격',
  '입고요청일',
  '입고일',
  '발주량',
  '기입고량',
  '입고량',
];

export const mapExportRow = (r: RowItem) => [
  r.RNUM,
  r.PO_NO,
  r.PO_YMD,
  r.ITEM_GB,
  r.ITEM_NM,
  r.ITEM_TP,
  r.STANDARD,
  r.REQ_YMD,
  r.IV_YMD,
  r.PO_QTY,
  r.PRE_IV_QTY,
  r.IV_QTY,
];

export async function fetchMmsm01002List(form: SearchForm): Promise<RowItem[]> {
  const data = await getApi<RowItem[]>('/api/v1/material/pomst/search', {
    poYmdS: toYmd(form.startDate),
    poYmdE: toYmd(form.endDate),
    cstCd: form.cstCd || '',
    itemCd: form.itemCd || '',
    // mathGb: form.mathGb || '',
  });
  return Array.isArray(data) ? data : [];
}
