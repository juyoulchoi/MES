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
  CHECK?: boolean;
  giYmd: string;
  giSeq: number;
  giSubSeq: number;
  cstCd?: string;
  itemCd: string;
  itemNm?: string;
  qty: number;
  unitCd: string;
  description?: string;
}

export interface IssueCancelPayload {
  masterData: Array<{
    method: 'U';
    userId: string;
    cstCd: string;
    giYmd: string;
    giSeq: string;
    desc: string;
  }>;
  detailData: Array<{
    method: 'D';
    giYmd: string;
    giSeq: string;
    giSubSeq: number | string;
    desc: string;
    itemCd: string;
    unitCd: string;
    qty: number | string;
  }>;
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

export function getIssueMasterKey(row: RowItem) {
  return [row.giYmd ?? '', row.giSeq ?? ''].join('|');
}

export function buildIssueCancelPayload(rows: RowItem[], userId: string): IssueCancelPayload[] {
  const grouped = new Map<string, RowItem[]>();

  rows.forEach((row) => {
    const key = getIssueMasterKey(row);
    const current = grouped.get(key) ?? [];
    current.push(row);
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).map((groupRows) => {
    const first = groupRows[0];

    return {
      masterData: [
        {
          method: 'U',
          userId,
          cstCd: first.cstCd ?? '',
          giYmd: String(first.giYmd ?? ''),
          giSeq: String(first.giSeq ?? ''),
          desc: '',
        },
      ],
      detailData: groupRows.map((row) => ({
        method: 'D',
        giYmd: String(row.giYmd ?? ''),
        giSeq: String(row.giSeq ?? ''),
        giSubSeq: row.giSubSeq,
        desc: row.description ?? '',
        itemCd: row.itemCd ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.qty ?? '',
      })),
    };
  });
}
