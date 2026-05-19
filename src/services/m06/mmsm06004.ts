import { http } from '@/lib/http';

export type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SERL?: number | string;
  CST_CD?: string;
  CST_NM?: string;
  REG_NO?: string;
  CST_GB?: string;
  CEO_NM?: string;
  MGR_NM?: string;
  MGR_TEL?: string;
  TEL_NO?: string;
  FAX_NO?: string;
  EMAIL?: string;
  POST_NO?: string;
  ADDR?: string;
  USE_YN?: string;
  [k: string]: unknown;
};

export type FetchMmsm06004Params = {
  cstGb?: string;
  useYn?: string;
};

function normalizeRow(row: Row, index: number): Row {
  return {
    CHECK: false,
    ISNEW: !!row.ISNEW,
    SERL: row.SERL ?? index + 1,
    CST_CD: row.CST_CD ?? '',
    CST_NM: row.CST_NM ?? '',
    REG_NO: row.REG_NO ?? '',
    CST_GB: row.CST_GB ?? '',
    CEO_NM: row.CEO_NM ?? '',
    MGR_NM: row.MGR_NM ?? '',
    MGR_TEL: row.MGR_TEL ?? '',
    TEL_NO: row.TEL_NO ?? '',
    FAX_NO: row.FAX_NO ?? '',
    EMAIL: row.EMAIL ?? '',
    POST_NO: row.POST_NO ?? '',
    ADDR: row.ADDR ?? '',
    USE_YN: row.USE_YN ?? 'Y',
  };
}

export function createNewMmsm06004Row(index: number): Row {
  return {
    CHECK: true,
    ISNEW: true,
    SERL: index + 1,
    CST_CD: '',
    CST_NM: '',
    REG_NO: '',
    CST_GB: '',
    CEO_NM: '',
    MGR_NM: '',
    MGR_TEL: '',
    TEL_NO: '',
    FAX_NO: '',
    EMAIL: '',
    POST_NO: '',
    ADDR: '',
    USE_YN: 'Y',
  };
}

export async function fetchMmsm06004Rows({ cstGb = '', useYn = '' }: FetchMmsm06004Params) {
  const params = new URLSearchParams();
  if (cstGb) params.set('cst_gb', cstGb);
  if (useYn) params.set('use_yn', useYn);
  const url = `/api/m06/mmsm06004/list${params.toString() ? `?${params.toString()}` : ''}`;
  const data = await http<Row[]>(url);
  return (Array.isArray(data) ? data : []).map(normalizeRow);
}

export async function deleteMmsm06004Rows(cstCds: string[]) {
  if (cstCds.length === 0) return;
  await http('/api/m06/mmsm06004/delete', {
    method: 'POST',
    body: cstCds.map((cd) => ({ CST_CD: cd })),
  });
}

export async function saveMmsm06004Rows(rows: Row[]) {
  const payload = rows.map((row) => ({
    CST_CD: row.CST_CD ?? '',
    CST_NM: row.CST_NM ?? '',
    REG_NO: row.REG_NO ?? '',
    CST_GB: row.CST_GB ?? '',
    CEO_NM: row.CEO_NM ?? '',
    MGR_NM: row.MGR_NM ?? '',
    MGR_TEL: row.MGR_TEL ?? '',
    TEL_NO: row.TEL_NO ?? '',
    FAX_NO: row.FAX_NO ?? '',
    EMAIL: row.EMAIL ?? '',
    POST_NO: row.POST_NO ?? '',
    ADDR: row.ADDR ?? '',
    USE_YN: row.USE_YN ?? 'Y',
    ISNEW: !!row.ISNEW,
  }));

  await http('/api/m06/mmsm06004/save', { method: 'POST', body: payload });
}

export function buildMmsm06004Csv(rows: Row[]) {
  const headers = [
    'No.',
    '거래처코드',
    '거래처명',
    '사업장등록번호',
    '거래처구분',
    '대표자명',
    '담당자명',
    '담당자연락처',
    '전화번호',
    '팩스번호',
    '이메일',
    '우편번호',
    '주소',
    '사용여부',
  ];
  const lines = rows.map((row, index) =>
    [
      row.SERL ?? index + 1,
      row.CST_CD ?? '',
      row.CST_NM ?? '',
      row.REG_NO ?? '',
      row.CST_GB ?? '',
      row.CEO_NM ?? '',
      row.MGR_NM ?? '',
      row.MGR_TEL ?? '',
      row.TEL_NO ?? '',
      row.FAX_NO ?? '',
      row.EMAIL ?? '',
      row.POST_NO ?? '',
      row.ADDR ?? '',
      row.USE_YN ?? '',
    ]
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}
