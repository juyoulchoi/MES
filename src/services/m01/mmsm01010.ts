import type { PageableResponse } from '@/lib/pagination';

export interface MasterRow {
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
  itemCd?: string;
  itemNm?: string;
}

export interface CustomerApiRow extends MasterRow {
  [key: string]: unknown;
  mainYn?: 'Y' | 'N' | '';
}

export interface DetailRow extends MasterRow {
  isNew?: boolean;
  isRegister?: boolean;
  mainYn?: 'Y' | 'N' | '';
}

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

function legacyString(row: object, key: string) {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

export function normalizeMasterRow(row: CustomerApiRow): MasterRow {
  return {
    ...row,
    cstCd: row.cstCd ?? legacyString(row, 'CST_CD') ?? legacyString(row, 'ITEM_CD') ?? '',
    cstNm: row.cstNm ?? legacyString(row, 'CST_NM') ?? legacyString(row, 'ITEM_NM') ?? '',
    custGb: row.custGb ?? legacyString(row, 'CUST_GB') ?? '',
    ceoNm: row.ceoNm ?? legacyString(row, 'CEO_NM') ?? '',
    mgrNm: row.mgrNm ?? legacyString(row, 'MGR_NM') ?? '',
    telNo: row.telNo ?? legacyString(row, 'TEL_NO') ?? '',
    mgrTel: row.mgrTel ?? legacyString(row, 'MGR_TEL') ?? '',
    email: row.email ?? legacyString(row, 'EMAIL') ?? '',
    faxNo: row.faxNo ?? legacyString(row, 'FAX_NO') ?? '',
    regNo: formatRegNo(row.regNo ?? legacyString(row, 'REG_NO') ?? ''),
    postNo: row.postNo ?? legacyString(row, 'POST_NO') ?? '',
    addr: row.addr ?? legacyString(row, 'ADDR') ?? '',
    status: row.status ?? legacyString(row, 'STATUS') ?? 'ACTIVE',
    itemCd: row.itemCd ?? legacyString(row, 'ITEM_CD') ?? '',
    itemNm: row.itemNm ?? legacyString(row, 'ITEM_NM') ?? '',
  };
}

export function normalizeCustomerRow(row: CustomerApiRow | DetailRow): DetailRow {
  return {
    ...row,
    cstCd: row.cstCd ?? legacyString(row, 'CST_CD') ?? legacyString(row, 'ITEM_CD') ?? '',
    cstNm: row.cstNm ?? legacyString(row, 'CST_NM') ?? legacyString(row, 'ITEM_NM') ?? '',
    custGb: row.custGb ?? legacyString(row, 'CUST_GB') ?? '',
    ceoNm: row.ceoNm ?? legacyString(row, 'CEO_NM') ?? '',
    mgrNm: row.mgrNm ?? legacyString(row, 'MGR_NM') ?? '',
    telNo: row.telNo ?? legacyString(row, 'TEL_NO') ?? '',
    mgrTel: row.mgrTel ?? legacyString(row, 'MGR_TEL') ?? '',
    email: row.email ?? legacyString(row, 'EMAIL') ?? '',
    faxNo: row.faxNo ?? legacyString(row, 'FAX_NO') ?? '',
    regNo: formatRegNo(row.regNo ?? legacyString(row, 'REG_NO') ?? ''),
    postNo: row.postNo ?? legacyString(row, 'POST_NO') ?? '',
    addr: row.addr ?? legacyString(row, 'ADDR') ?? '',
    status: row.status ?? legacyString(row, 'STATUS') ?? 'ACTIVE',
    itemCd: row.itemCd ?? legacyString(row, 'ITEM_CD') ?? '',
    itemNm: row.itemNm ?? legacyString(row, 'ITEM_NM') ?? '',
    mainYn: row.mainYn ?? (legacyString(row, 'MAIN_YN') as 'Y' | 'N' | undefined) ?? '',
  };
}

export function toCustInfoPayload(row: DetailRow) {
  return {
    method: 'Y',
    isNew: row.isRegister ? 'I' : '',
    cstCd: row.isRegister ? '' : row.cstCd ?? '',
    cstNm: row.cstNm ?? '',
    regNo: formatRegNo(row.regNo ?? ''),
    ceoNm: row.ceoNm ?? '',
    mgrNm: row.mgrNm ?? '',
    telNo: row.telNo ?? '',
    email: row.email ?? '',
    mgrTel: row.mgrTel ?? '',
    faxNo: row.faxNo ?? '',
    postNo: row.postNo ?? '',
    addr: row.addr ?? '',
    custGb: row.custGb ?? '',
    status: row.status || 'ACTIVE',
  };
}

export function patchCustomerRow<T extends MasterRow | DetailRow>(
  row: T,
  patch: Partial<DetailRow>
): T {
  return {
    ...row,
    ...patch,
    cstNm: patch.cstNm ?? row.cstNm,
    custGb: patch.custGb ?? row.custGb,
    ceoNm: patch.ceoNm ?? row.ceoNm,
    mgrNm: patch.mgrNm ?? row.mgrNm,
    telNo: patch.telNo ?? row.telNo,
    mgrTel: patch.mgrTel ?? row.mgrTel,
    email: patch.email ?? row.email,
    faxNo: patch.faxNo ?? row.faxNo,
    regNo: patch.regNo ?? row.regNo,
    postNo: patch.postNo ?? row.postNo,
    addr: patch.addr ?? row.addr,
    status: patch.status ?? row.status,
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
