import { getApi } from '@/lib/axiosClient';
import { toPageResult, type PageResult, type PageableResponse } from '@/lib/pagination';
import { type BaseTableClassNames, type TableColumn } from '@/components/table/BaseTable';
import { formatNumber } from '@/lib/utils';

export interface SearchForm {
  startDate: string;
  endDate: string;
  cstCd: string;
  cstNm: string;
  itemCd: string;
  itemNm: string;
  itemGb: string;
}

export interface RowItem {
  rnum: number;
  poYmd: string;
  poSeq: number;
  poSubSeq: number;
  itemGb: string;
  itemNm: string;
  cstCd: string;
  cstNm: string;
  totAmt: number;
  preIvQty: number;
  ivQty: number;
  itemCd: string;
  unitCd: string;
  giYmd: string;
  emGb: string;
  reqYmd: string;
  ivYmd: string;
  endYn: string;
  status: string;
  description: string;
}

export type Mmsm01002ListResult = PageResult<RowItem>;

export const columns: TableColumn<RowItem>[] = [
  { key: 'RNUM', header: '순번', width: 80, align: 'center', accessor: 'rnum' },
  {
    key: 'PO_YMD',
    header: '발주일자',
    width: 100,
    align: 'center',
    accessor: 'poYmd',
    render: (row) => `${row.poYmd}_${row.poSeq}_${row.poSubSeq}`,
  },
  { key: 'ITEM_GB', header: '원자재구분', width: 100, align: 'center', accessor: 'itemGb' },
  { key: 'ITEM_NM', header: '원자재명', width: 160, accessor: 'itemNm' },
  { key: 'CST_NM', header: '거래처명', width: 160, accessor: 'cstNm' },
  {
    key: 'TOT_AMT',
    header: '총금액',
    width: 120,
    align: 'right',
    accessor: 'totAmt',
    render: (row) => formatNumber(row.totAmt),
  },
  { key: 'PRE_IV_QTY', header: '기입고량', width: 120, align: 'right', accessor: 'preIvQty' },
  { key: 'IV_QTY', header: '입고량', width: 120, align: 'right', accessor: 'ivQty' },
  { key: 'ITEM_CD', header: '품목코드', width: 120, align: 'center', accessor: 'itemCd' },
  { key: 'GI_YMD', header: '출고일자', width: 120, align: 'center', accessor: 'giYmd' },
  { key: 'REQ_YMD', header: '입고요청일', width: 120, align: 'center', accessor: 'reqYmd' },
  { key: 'IV_YMD', header: '입고일', width: 120, align: 'center', accessor: 'ivYmd' },
  { key: 'END_YN', header: '완료여부', width: 120, align: 'center', accessor: 'endYn' },
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
  '발주일자',
  '발주순번',
  '발주서브순번',
  '원자재구분',
  '원자재명',
  '거래처코드',
  '거래처명',
  '총금액',
  '기입고량',
  '입고량',
  '품목코드',
  '단위코드',
  '출고일자',
  '긴급구분',
  '입고요청일',
  '입고일',
  '완료여부',
  '상태',
  '비고',
];

export const mapExportRow = (r: RowItem) => [
  r.rnum,
  r.poYmd,
  r.poSeq,
  r.poSubSeq,
  r.itemGb,
  r.itemNm,
  r.cstCd,
  r.cstNm,
  r.totAmt,
  r.preIvQty,
  r.ivQty,
  r.itemCd,
  r.unitCd,
  r.giYmd,
  r.emGb,
  r.reqYmd,
  r.ivYmd,
  r.endYn,
  r.status,
  r.description,
];

export async function fetchMmsm01002List(
  form: SearchForm,
  page = 0,
  size = 10
): Promise<Mmsm01002ListResult> {
  const data = await getApi<PageableResponse<RowItem> | RowItem[]>(
    '/api/v1/material/pomst/search',
    {
      poYmdS: toYmd(form.startDate),
      poYmdE: toYmd(form.endDate),
      cstCd: form.cstCd || '',
      itemCd: form.itemCd || '',
      itemGb: form.itemGb || '',
      page: String(page),
      size: String(size),
    }
  );
  return toPageResult(data, page, size);
}
