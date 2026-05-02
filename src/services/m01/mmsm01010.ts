import type { PageableResponse } from '@/lib/pagination';

export interface MasterRow {
  CST_CD?: string;
  CST_NM?: string;
  CUST_GB?: string;
  CEO_NM?: string;
  MGR_NM?: string;
  TEL_NO?: string;
  MGR_TEL?: string;
  EMAIL?: string;
  FAX_NO?: string;
  REG_NO?: string;
  POST_NO?: string;
  ADDR?: string;
  STATUS?: string;
  cstCd?: string;
  cstNm?: string;
  custGb?: string;
  ceoNm?: string;
  mgrNm?: string;
  telNo?: string;
  mgrTel?: string;
  email?: string;
  faxNo?: string;
  regNo?: string;
  postNo?: string;
  addr?: string;
  status?: string;
  ITEM_CD?: string;
  ITEM_NM?: string;
}

export interface DetailRow extends MasterRow {
  ISNEW?: boolean;
  IS_REGISTER?: boolean;
  MAIN_YN?: 'Y' | 'N' | '';
}

export const exportHeaders = ['거래처코드', '거래처명', '구분', '담당자', '연락처', '대표여부'];

export const mapExportRow = (row: DetailRow) => [
  row.CST_CD ?? row.ITEM_CD ?? '',
  row.CST_NM ?? row.ITEM_NM ?? '',
  row.CUST_GB ?? '',
  row.MGR_NM ?? '',
  row.TEL_NO ?? row.MGR_TEL ?? '',
  row.MAIN_YN ?? '',
];

export function formatRegNo(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function onlyDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, '');
  return maxLength ? digits.slice(0, maxLength) : digits;
}

export function normalizeCustomerRow<T extends MasterRow | DetailRow>(row: T): T {
  return {
    ...row,
    CST_CD: row.CST_CD ?? row.cstCd ?? row.ITEM_CD ?? '',
    CST_NM: row.CST_NM ?? row.cstNm ?? row.ITEM_NM ?? '',
    CUST_GB: row.CUST_GB ?? row.custGb ?? '',
    CEO_NM: row.CEO_NM ?? row.ceoNm ?? '',
    MGR_NM: row.MGR_NM ?? row.mgrNm ?? '',
    TEL_NO: row.TEL_NO ?? row.telNo ?? '',
    MGR_TEL: row.MGR_TEL ?? row.mgrTel ?? '',
    EMAIL: row.EMAIL ?? row.email ?? '',
    FAX_NO: row.FAX_NO ?? row.faxNo ?? '',
    REG_NO: formatRegNo(row.REG_NO ?? row.regNo ?? ''),
    POST_NO: row.POST_NO ?? row.postNo ?? '',
    ADDR: row.ADDR ?? row.addr ?? '',
    STATUS: row.STATUS ?? row.status ?? 'ACTIVE',
  };
}

export function toCustInfoPayload(row: DetailRow) {
  return {
    method: 'Y',
    isNew: row.IS_REGISTER ? 'I' : '',
    cstCd: row.IS_REGISTER ? '' : row.CST_CD ?? '',
    cstNm: row.CST_NM ?? '',
    regNo: formatRegNo(row.REG_NO ?? ''),
    ceoNm: row.CEO_NM ?? '',
    mgrNm: row.MGR_NM ?? '',
    telNo: row.TEL_NO ?? '',
    email: row.EMAIL ?? '',
    mgrTel: row.MGR_TEL ?? '',
    faxNo: row.FAX_NO ?? '',
    postNo: row.POST_NO ?? '',
    addr: row.ADDR ?? '',
    custGb: row.CUST_GB ?? '',
    status: row.STATUS || 'ACTIVE',
  };
}

export function patchCustomerRow<T extends MasterRow | DetailRow>(
  row: T,
  patch: Partial<DetailRow>
): T {
  return {
    ...row,
    ...patch,
    cstNm: patch.CST_NM ?? row.cstNm,
    custGb: patch.CUST_GB ?? row.custGb,
    ceoNm: patch.CEO_NM ?? row.ceoNm,
    mgrNm: patch.MGR_NM ?? row.mgrNm,
    telNo: patch.TEL_NO ?? row.telNo,
    mgrTel: patch.MGR_TEL ?? row.mgrTel,
    email: patch.EMAIL ?? row.email,
    faxNo: patch.FAX_NO ?? row.faxNo,
    regNo: patch.REG_NO ?? row.regNo,
    postNo: patch.POST_NO ?? row.postNo,
    addr: patch.ADDR ?? row.addr,
    status: patch.STATUS ?? row.status,
  };
}

export function formatStatus(value?: string) {
  if (value === 'INACTIVE') return '비활성화';
  return '활성';
}

export function getContent<T>(data: PageableResponse<T> | T[] | T | null | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && 'content' in data) {
    return Array.isArray(data.content) ? data.content : [];
  }
  return [data as T];
}
