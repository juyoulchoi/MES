import { http } from '@/lib/http';

export type MasterRow = {
  CHECK?: boolean;
  isNew?: boolean;
  dspSeq?: number | string;
  bscGrpCd?: string;
  bscGrpNm?: string;
  useYn?: string;
  [k: string]: unknown;
};

export type DetailRow = {
  CHECK?: boolean;
  isNew?: boolean;
  dspSeq?: number | string;
  bscCd?: string;
  bscNm?: string;
  bscNm2?: string;
  desc?: string;
  useYn?: string;
  [k: string]: unknown;
};

type MdmGroupResponse = {
  grpCd?: string;
  grpNm?: string;
  dspSeq?: number | string;
  status?: unknown;
};

type MdmCodeResponse = {
  grpCd?: string;
  codeCd?: string;
  codeNm?: string;
  codeNm2?: string;
  dspSeq?: number | string;
  description?: string;
  status?: unknown;
};

type ApiPage<T> = {
  content?: T[];
};

export type FetchMasterParams = {
  grpCd?: string;
  grpNm?: string;
};

function statusToUseYn(status: unknown) {
  if (!status) return 'Y';
  const value =
    typeof status === 'object' && status !== null && 'code' in status
      ? String((status as { code?: unknown }).code ?? '')
      : String(status);
  return value.toUpperCase() === 'ACTIVE' ? 'Y' : 'N';
}

export function mapUseYnToStatus(useYn: string | undefined) {
  return useYn === 'N' ? 'INACTIVE' : 'ACTIVE';
}

export function toNullableNumber(value: string | number | undefined) {
  if (value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function mapGroupRow(row: MdmGroupResponse): MasterRow {
  return {
    CHECK: false,
    isNew: false,
    dspSeq: row.dspSeq ?? '',
    bscGrpCd: row.grpCd ?? '',
    bscGrpNm: row.grpNm ?? '',
    useYn: statusToUseYn(row.status),
  };
}

function mapCodeRow(row: MdmCodeResponse): DetailRow {
  return {
    CHECK: false,
    isNew: false,
    dspSeq: row.dspSeq ?? '',
    bscCd: row.codeCd ?? '',
    bscNm: row.codeNm ?? '',
    bscNm2: row.codeNm2 ?? '',
    desc: row.description ?? '',
    useYn: statusToUseYn(row.status),
  };
}

export async function fetchMmsm06001Master({ grpCd = '', grpNm = '' }: FetchMasterParams) {
  const qs = new URLSearchParams({ size: '1000' });
  if (grpCd.trim()) qs.set('grpCd', grpCd.trim());
  if (grpNm.trim()) qs.set('grpNm', grpNm.trim());
  const data = await http<ApiPage<MdmGroupResponse>>(`/api/v1/mdm/grp/search?${qs}`);
  return (Array.isArray(data.content) ? data.content : []).map(mapGroupRow);
}

export async function fetchMmsm06001Detail(grpCd: string) {
  if (!grpCd) return [] as DetailRow[];
  const qs = new URLSearchParams({ grpCd, codeCd: '', codeNm: '' }).toString();
  const data = await http<MdmCodeResponse[]>(`/api/v1/mdm/code/search?${qs}`);
  return (Array.isArray(data) ? data : []).map(mapCodeRow);
}

export async function deleteMmsm06001Master(grpCd: string) {
  await http(`/api/v1/mdm/grp`, {
    method: 'POST',
    body: { method: 'D', grpCd },
  });
}

export async function saveMmsm06001Master(row: MasterRow) {
  await http(`/api/v1/mdm/grp`, {
    method: 'POST',
    body: {
      method: row.isNew ? 'I' : 'U',
      isNew: row.isNew ? 'I' : 'U',
      grpCd: row.bscGrpCd ?? '',
      grpNm: row.bscGrpNm ?? '',
      dspSeq: toNullableNumber(row.dspSeq),
      status: mapUseYnToStatus(row.useYn),
    },
  });
}

export async function deleteMmsm06001Detail(grpCd: string, codeCd: string) {
  await http(`/api/v1/mdm/code`, {
    method: 'POST',
    body: { method: 'D', grpCd, codeCd },
  });
}

export async function saveMmsm06001Detail(grpCd: string, row: DetailRow) {
  await http(`/api/v1/mdm/code`, {
    method: 'POST',
    body: {
      method: row.isNew ? 'I' : 'U',
      isNew: row.isNew ? 'I' : 'U',
      grpCd,
      codeCd: row.bscCd ?? '',
      codeNm: row.bscNm ?? '',
      codeNm2: row.bscNm2 ?? '',
      dspSeq: toNullableNumber(row.dspSeq),
      description: row.desc ?? '',
      status: mapUseYnToStatus(row.useYn),
    },
  });
}
