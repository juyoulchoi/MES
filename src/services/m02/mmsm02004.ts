import type { Mmsm02002MasterRow } from '@/services/m02/mmsm02002';

export type WorkOrderCreateResponse = {
  workOrderYmd?: string;
  workOrderSeq?: number;
};

export function getFirstDayOfMonthYmd() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

export const exportHeaders = [
  '생산계획일자',
  '계획번호',
  '수주일자',
  '수주번호',
  '거래처',
  '제품코드',
  '제품명',
  '단위',
  '지시수량',
  '납기요청일',
  '생산예정일',
  '공정',
  '계획상태',
];

export const mapExportRow = (row: Mmsm02002MasterRow) => [
  row.planYmd ?? '',
  row.planNo ?? '',
  row.soYmd ?? '',
  row.soNo ?? '',
  row.cstNm ?? '',
  row.itemCd ?? '',
  row.itemNm ?? '',
  row.unitCd ?? '',
  row.planQty ?? '',
  row.reqYmd ?? '',
  row.prdSchdYmd ?? '',
  row.procNm ?? '',
  row.planStatusNm ?? '',
];
