export type Mmsm02002DateType = string;
export type Mmsm02002PlanStatus = string;

export interface Mmsm02002SearchForm {
  dateType: Mmsm02002DateType;
  dateFrom: string;
  dateTo: string;
  cstCd: string;
  cstNm: string;
  itemCd: string;
  itemNm: string;
  planStatus: Mmsm02002PlanStatus;
  procCd: string;
}

export interface Mmsm02002MasterRow {
  CHECK?: boolean;
  ISNEW?: boolean;
  planYmd?: string;
  planNo?: string | number;
  soYmd?: string;
  soNo?: string | number;
  cstNm?: string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  soQty?: string | number;
  planQty?: string | number;
  reqYmd?: string;
  prdSchdYmd?: string;
  procNm?: string;
  planStatusNm?: string;
  planStatus?: string;
  prdPlnYmd?: string;
  prdPlnSeq?: string | number;
  soSeq?: string | number;
  procCd?: string;
}

export interface Mmsm02002BomMaterialRow {
  matCd?: string;
  matNm?: string;
  reqQty?: string | number;
  stockQty?: string | number;
  shortageQty?: string | number;
}

export interface Mmsm02002ProcessRow {
  procCd?: string;
  procNm?: string;
  procSeq?: string | number;
  unitCd?: string;
}

export interface Mmsm02002SalesLinkRow {
  originSoNo?: string | number;
  custDueYmd?: string;
  priority?: string | number;
  cstCd?: string;
  cstNm?: string;
  itemCd?: string;
  itemNm?: string;
  soQty?: string | number;
  unitCd?: string;
}

export interface Mmsm02002PlanReviewResponse {
  bomMaterials?: Mmsm02002BomMaterialRow[];
  processRows?: Mmsm02002ProcessRow[];
  salesLinks?: Mmsm02002SalesLinkRow[];
}

export function normalizeMmsm02002MasterRow(
  row: Mmsm02002MasterRow
): Mmsm02002MasterRow {
  return {
    ...row,
    planYmd: row.planYmd ?? row.prdPlnYmd ?? '',
    planNo: row.planNo ?? row.prdPlnSeq ?? '',
    soYmd: row.soYmd ?? '',
    soNo: row.soNo ?? row.soSeq ?? '',
    cstNm: row.cstNm ?? '',
    itemCd: row.itemCd ?? '',
    itemNm: row.itemNm ?? '',
    unitCd: row.unitCd ?? '',
    soQty: row.soQty ?? '',
    planQty: row.planQty ?? '',
    reqYmd: row.reqYmd ?? '',
    prdSchdYmd: row.prdSchdYmd ?? '',
    planStatusNm: row.planStatusNm ?? row.planStatus ?? '',
    CHECK: false,
    ISNEW: false,
  };
}

function escapeCsvValue(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function exportMmsm02002PlanCsv(rows: Mmsm02002MasterRow[]) {
  const headers = [
    '생산계획일자',
    '계획번호',
    '수주일자',
    '수주번호',
    '거래처',
    '제품코드',
    '제품명',
    '단위',
    '수주수량',
    '계획수량',
    '납기요청일',
    '생산예정일',
    '공정',
    '계획상태',
  ];
  const lines = rows.map((row) =>
    [
      row.planYmd,
      row.planNo,
      row.soYmd,
      row.soNo,
      row.cstNm,
      row.itemCd,
      row.itemNm,
      row.unitCd,
      row.soQty,
      row.planQty,
      row.reqYmd,
      row.prdSchdYmd,
      row.procNm,
      row.planStatusNm,
    ]
      .map(escapeCsvValue)
      .join(',')
  );
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'MMSM02002E_plan.csv';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
