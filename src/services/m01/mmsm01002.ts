import type { GridColumn } from '@/components/table/DataGrid';
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
  CHECK?: boolean;
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
  remQty: number;
  itemCd: string;
  unitCd: string;
  price: number;
  amt: number;
  giYmd: string;
  emGb: string;
  reqYmd: string;
  ivYmd: string;
  endYn: string;
  receiptStatus: string;
  receiptStatusNm?: string;
  status: string;
  description: string;
}

export interface PurchaseCancelPayload {
  masterData: Array<{
    method: 'U';
    userId: string;
    cstCd: string;
    poYmd: string;
    poSeq: string;
    desc: string;
  }>;
  detailData: Array<{
    method: 'D';
    poYmd: string;
    poSeq: string;
    poSubSeq: number | string;
    reqYmd: string;
    emGb: string;
    desc: string;
    itemCd: string;
    unitCd: string;
    qty: number | string;
    price?: number | string;
    amt?: number | string;
  }>;
}

const receiptStatusLabelMap: Record<string, string> = {
  NOT_RECEIVED: '미입고',
  PARTIAL_RECEIVED: '부분입고',
  RECEIVED_COMPLETE: '입고완료',
};

function formatReceiptStatus(value: string) {
  return receiptStatusLabelMap[value] ?? value;
}

function getReceiptStatusLabel(row: Pick<RowItem, 'receiptStatus' | 'receiptStatusNm'>) {
  return row.receiptStatusNm || formatReceiptStatus(row.receiptStatus);
}

export const columns: GridColumn<RowItem>[] = [
  { dataField: 'rnum', caption: '순번', width: 80, alignment: 'center' },
  {
    dataField: 'poYmd',
    caption: '발주일자',
    width: 140,
    alignment: 'center',
    cellRender: (row) => `${row.poYmd}_${row.poSeq}_${row.poSubSeq}`,
  },
  { dataField: 'itemCd', caption: '품목코드', width: 120, alignment: 'center' },
  { dataField: 'itemNm', caption: '원자재명', width: 180 },
  {
    dataField: 'price',
    caption: '단가',
    width: 100,
    alignment: 'right',
    headerAlignment: 'center',
    cellRender: (row) => formatNumber(row.price),
  },
  {
    dataField: 'amt',
    caption: '금액',
    width: 110,
    alignment: 'right',
    headerAlignment: 'center',
    cellRender: (row) => formatNumber(row.amt),
  },
  {
    dataField: 'remQty',
    caption: '잔량',
    width: 100,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.remQty),
  },
  {
    dataField: 'receiptStatus',
    caption: '입고상태',
    width: 110,
    alignment: 'center',
    cellRender: (row) => getReceiptStatusLabel(row),
  },
  { dataField: 'cstNm', caption: '거래처명', width: 160 },
  { dataField: 'reqYmd', caption: '입고요청일', width: 120, alignment: 'center' },
  { dataField: 'emGb', caption: '발주구분', width: 110, alignment: 'center' },
  { dataField: 'preIvQty', caption: '기입고량', width: 120, alignment: 'right' },
  { dataField: 'description', caption: '비고', width: 260 },
];

export const exportHeaders = [
  '순번',
  '발주일자',
  '발주순번',
  '발주서브순번',
  '원자재명',
  '거래처코드',
  '거래처명',
  '단가',
  '금액',
  '잔량',
  '입고상태',
  '기입고량',
  '입고량',
  '품목코드',
  '단위코드',
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
  r.itemNm,
  r.cstCd,
  r.cstNm,
  r.price,
  r.amt,
  r.remQty,
  getReceiptStatusLabel(r),
  r.preIvQty,
  r.ivQty,
  r.itemCd,
  r.unitCd,
  r.emGb,
  r.reqYmd,
  r.ivYmd,
  r.endYn,
  r.status,
  r.description,
];

export function getPurchaseMasterKey(row: RowItem) {
  return [row.poYmd ?? '', row.poSeq ?? ''].join('|');
}

export function buildPurchaseCancelPayload(rows: RowItem[], userId: string): PurchaseCancelPayload[] {
  const grouped = new Map<string, RowItem[]>();

  rows.forEach((row) => {
    const key = getPurchaseMasterKey(row);
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
          poYmd: String(first.poYmd ?? ''),
          poSeq: String(first.poSeq ?? ''),
          desc: '',
        },
      ],
      detailData: groupRows.map((row) => ({
        method: 'D',
        poYmd: String(row.poYmd ?? ''),
        poSeq: String(row.poSeq ?? ''),
        poSubSeq: row.poSubSeq,
        reqYmd: row.reqYmd ?? '',
        emGb: row.emGb ?? '',
        desc: row.description ?? '',
        itemCd: row.itemCd ?? '',
        unitCd: row.unitCd ?? '',
        qty: '',
        price: row.price ?? '',
        amt: row.amt ?? '',
      })),
    };
  });
}


