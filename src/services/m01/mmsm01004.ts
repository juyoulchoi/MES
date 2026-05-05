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
  rnum?: number | string;
  ivYmd: string;
  ivSeq: number;
  ivSubSeq: number;
  poYmd?: string;
  poSeq?: number;
  poSubSeq?: number;
  cstCd?: string;
  cstNm?: string;
  itemCd: string;
  itemNm: string;
  qty: number;
  price: number;
  amt: number;
  unitCd: string;
}

export interface ReceiptCancelPayload {
  masterData: Array<{
    method: 'U';
    userId: string;
    cstCd: string;
    ivYmd: string;
    ivSeq: string;
  }>;
  detailData: Array<{
    method: 'D';
    ivYmd: string;
    ivSeq: string;
    ivSubSeq: number | string;
    poYmd?: string;
    poSeq?: number | string;
    poSubSeq?: number | string;
    itemCd: string;
    unitCd: string;
    qty: number | string;
    price?: number | string;
    amt?: number | string;
  }>;
}

export const columns: GridColumn<RowItem>[] = [
  { dataField: 'rnum', caption: '순번', width: 80, alignment: 'center', cellRender: (row, index) => row.rnum ?? index + 1 },
  { dataField: 'ivYmd', caption: '입고일자', width: 120, alignment: 'center' },
  { dataField: 'poYmd', caption: '발주일자', width: 120, alignment: 'center' },
  { dataField: 'cstNm', caption: '거래처명', width: 180 },
  { dataField: 'itemCd', caption: '원자재코드', width: 120, alignment: 'center' },
  { dataField: 'itemNm', caption: '원자재명', width: 220 },
  { dataField: 'qty', caption: '입고수량', width: 120, alignment: 'right', cellRender: (row) => formatNumber(row.qty) },
  { dataField: 'price', caption: '단가', width: 120, alignment: 'right', cellRender: (row) => formatNumber(row.price) },
  { dataField: 'amt', caption: '금액', width: 130, alignment: 'right', cellRender: (row) => formatNumber(row.amt) },
  { dataField: 'unitCd', caption: '단위', width: 90, alignment: 'center' },
];

export const exportHeaders = [
  '순번',
  '입고일자',
  '발주일자',
  '거래처코드',
  '거래처명',
  '원자재코드',
  '원자재명',
  '입고수량',
  '단가',
  '금액',
  '단위',
];

export const mapExportRow = (row: RowItem, index: number) => [
  row.rnum ?? index + 1,
  row.ivYmd,
  row.poYmd ?? '',
  row.cstCd ?? '',
  row.cstNm ?? '',
  row.itemCd,
  row.itemNm,
  row.qty,
  row.price,
  row.amt,
  row.unitCd,
];

export function getReceiptMasterKey(row: RowItem) {
  return [row.ivYmd ?? '', row.ivSeq ?? ''].join('|');
}

export function buildReceiptCancelPayload(rows: RowItem[], userId: string): ReceiptCancelPayload[] {
  const grouped = new Map<string, RowItem[]>();

  rows.forEach((row) => {
    const key = getReceiptMasterKey(row);
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
          ivYmd: String(first.ivYmd ?? ''),
          ivSeq: String(first.ivSeq ?? ''),
        },
      ],
      detailData: groupRows.map((row) => ({
        method: 'D',
        ivYmd: String(row.ivYmd ?? ''),
        ivSeq: String(row.ivSeq ?? ''),
        ivSubSeq: row.ivSubSeq,
        poYmd: row.poYmd ?? '',
        poSeq: row.poSeq ?? '',
        poSubSeq: row.poSubSeq ?? '',
        itemCd: row.itemCd ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.qty ?? '',
        price: row.price ?? '',
        amt: row.amt ?? '',
      })),
    };
  });
}
