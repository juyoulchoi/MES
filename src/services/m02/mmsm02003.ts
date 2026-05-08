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
  procCd?: string;
  procNm?: string;
  itemCd?: string;
  itemNm?: string;
  cstCd?: string;
  cstNm?: string;
  planQty?: number | string;
  prdQty?: number | string;
  remainQty?: number | string;
  achievementRate?: number | string;
}

export interface ApiRow extends RowItem {
  RNUM?: number | string;
  REQ_YMD?: string;
  PROC_CD?: string;
  LINE_NM?: string;
  ITEM_CD?: string;
  ITEM_NM?: string;
  CST_CD?: string;
  CST_NM?: string;
  PRD_QTY?: number | string;
  QTY?: number | string;
  [key: string]: unknown;
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 0;
  const numberValue = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function formatPercent(value: number) {
  return `${value.toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  })}%`;
}

export function normalizeRows(rows: ApiRow[]): RowItem[] {
  return rows.map((row, index) => {
    const planQty = row.planQty ?? row.PRD_QTY ?? '';
    const prdQty = row.prdQty ?? row.QTY ?? '';
    const planQtyNumber = toNumber(planQty);
    const prdQtyNumber = toNumber(prdQty);
    const remainQty = planQtyNumber - prdQtyNumber;
    const achievementRate = planQtyNumber > 0 ? (prdQtyNumber / planQtyNumber) * 100 : 0;

    return {
      ...row,
      rnum: row.rnum ?? row.RNUM ?? index + 1,
      workYmd: row.workYmd ?? row.REQ_YMD ?? '',
      procCd: row.procCd ?? row.PROC_CD ?? '',
      procNm: row.procNm ?? row.LINE_NM ?? '',
      itemCd: row.itemCd ?? row.ITEM_CD ?? '',
      itemNm: row.itemNm ?? row.ITEM_NM ?? '',
      cstCd: row.cstCd ?? row.CST_CD ?? '',
      cstNm: row.cstNm ?? row.CST_NM ?? '',
      planQty,
      prdQty,
      remainQty,
      achievementRate,
    };
  });
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
  { dataField: 'procCd', caption: '공정코드', width: 110, alignment: 'center' },
  { dataField: 'procNm', caption: '공정', width: 150 },
  { dataField: 'itemCd', caption: '제품코드', width: 120, alignment: 'center' },
  { dataField: 'itemNm', caption: '제품명', width: 200 },
  { dataField: 'cstCd', caption: '거래처코드', width: 120, alignment: 'center' },
  { dataField: 'cstNm', caption: '거래처명', width: 160 },
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
  {
    dataField: 'remainQty',
    caption: '생산잔량',
    width: 120,
    alignment: 'right',
    cellRender: (row) => formatNumber(row.remainQty ?? 0),
  },
  {
    dataField: 'achievementRate',
    caption: '달성률',
    width: 100,
    alignment: 'right',
    cellRender: (row) => formatPercent(toNumber(row.achievementRate)),
  },
];

export const exportHeaders = [
  '순번',
  '작업일자',
  '공정코드',
  '공정',
  '제품코드',
  '제품명',
  '거래처코드',
  '거래처명',
  '계획수량',
  '생산수량',
  '생산잔량',
  '달성률',
];

export const mapExportRow = (row: RowItem, index: number) => [
  row.rnum ?? index + 1,
  row.workYmd ?? '',
  row.procCd ?? '',
  row.procNm ?? '',
  row.itemCd ?? '',
  row.itemNm ?? '',
  row.cstCd ?? '',
  row.cstNm ?? '',
  row.planQty ?? '',
  row.prdQty ?? '',
  row.remainQty ?? '',
  formatPercent(toNumber(row.achievementRate)),
];
