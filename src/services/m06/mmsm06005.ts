import { http } from '@/lib/http';

export type GroupRow = {
  CHECK?: boolean;
  PROC_GRP_CD?: string;
  PROC_GRP_NM?: string;
  [k: string]: unknown;
};

export type ProcRow = {
  CHECK?: boolean;
  PROC_CD?: string;
  PROC_NM?: string;
  [k: string]: unknown;
};

type ProcGrpInfoResponse = {
  procGb?: string;
  procGrpNm?: string;
  dspSeq?: number | string;
  status?: unknown;
  PROC_GRP_CD?: string;
  PROC_GRP_NM?: string;
};

type ProcCodeResponse = {
  procCd?: string;
  procNm?: string;
  PROC_CD?: string;
  PROC_NM?: string;
};

function mapGroupRow(row: ProcGrpInfoResponse): GroupRow {
  return {
    CHECK: false,
    PROC_GRP_CD: row.procGb ?? row.PROC_GRP_CD ?? '',
    PROC_GRP_NM: row.procGrpNm ?? row.PROC_GRP_NM ?? '',
  };
}

function mapProcRow(row: ProcCodeResponse): ProcRow {
  return {
    CHECK: false,
    PROC_CD: row.procCd ?? row.PROC_CD ?? '',
    PROC_NM: row.procNm ?? row.PROC_NM ?? '',
  };
}

export async function fetchMmsm06005Groups() {
  const data = await http<ProcGrpInfoResponse[]>(`/api/v1/mdm/procGrpInfo/search`);
  return (Array.isArray(data) ? data : []).map(mapGroupRow);
}

export async function fetchMmsm06005Procs(procGb = '') {
  const url = procGb
    ? `/api/v1/mdm/procInfo/searchProcInfoNotGrpList?${new URLSearchParams({ procGb })}`
    : `/api/v1/mdm/procInfo/searchCodeList?${new URLSearchParams({ status: 'ACTIVE' })}`;
  const data = await http<ProcCodeResponse[]>(url);
  return (Array.isArray(data) ? data : []).map(mapProcRow);
}

export async function fetchMmsm06005GroupProcs(grpCd: string) {
  if (!grpCd) return [] as ProcRow[];

  const qs = new URLSearchParams({ procGb: grpCd }).toString();
  const data = await http<ProcCodeResponse[]>(`/api/v1/mdm/procGrpAsi/searchProcGrpProcList?${qs}`);
  return (Array.isArray(data) ? data : []).map(mapProcRow);
}

export async function addMmsm06005GroupProcs(grpCd: string, procCds: string[]) {
  for (const procCd of procCds) {
    await http(`/api/v1/mdm/procGrpAsi/save`, {
      method: 'POST',
      body: {
        method: 'I',
        isNew: 'I',
        procGb: grpCd,
        procCd,
        procSeq: '',
        status: 'ACTIVE',
      },
    });
  }
}

export async function deleteMmsm06005GroupProcs(grpCd: string, procCds: string[]) {
  for (const procCd of procCds) {
    await http(`/api/v1/mdm/procGrpAsi/save`, {
      method: 'POST',
      body: {
        method: 'D',
        procGb: grpCd,
        procCd,
      },
    });
  }
}

export function buildMmsm06005Csv(grpCd: string, rows: ProcRow[]) {
  const headers = ['공정그룹', '라우팅공정코드', '라우팅공정명'];
  const lines = rows.map((row) =>
    [grpCd, row.PROC_CD ?? '', row.PROC_NM ?? '']
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );

  return [headers.join(','), ...lines].join('\n');
}
