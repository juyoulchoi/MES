import { http } from '@/lib/http';

export type GroupRow = {
  check?: boolean;
  procGrpCd?: string;
  procGrpNm?: string;
  [k: string]: unknown;
};

export type ProcRow = {
  check?: boolean;
  procCd?: string;
  procNm?: string;
  [k: string]: unknown;
};

type ProcGrpInfoResponse = {
  procGb?: string;
  procGrpNm?: string;
  dspSeq?: number | string;
  status?: unknown;
  grpCd?: string;
  grpNm?: string;
};

type ProcCodeResponse = {
  procCd?: string;
  procNm?: string;
};

const PROC_ROUTING_GROUP_CODES = new Set(['PROC', 'PROC_GB', 'ROUTING', 'ROUTING_GB', 'RT']);
const PROC_ROUTING_GROUP_PREFIXES = ['PROC_', 'ROUTING_', 'RT_'];

function resolveGroupCode(row: ProcGrpInfoResponse) {
  return row.procGb ?? row.grpCd ?? '';
}

function isProcRoutingGroup(row: ProcGrpInfoResponse) {
  const grpCd = resolveGroupCode(row).toUpperCase();
  return (
    PROC_ROUTING_GROUP_CODES.has(grpCd) ||
    PROC_ROUTING_GROUP_PREFIXES.some((prefix) => grpCd.startsWith(prefix))
  );
}

function mapGroupRow(row: ProcGrpInfoResponse): GroupRow {
  return {
    check: false,
    procGrpCd: resolveGroupCode(row),
    procGrpNm: row.procGrpNm ?? row.grpNm ?? '',
  };
}

function mapProcRow(row: ProcCodeResponse): ProcRow {
  return {
    check: false,
    procCd: row.procCd ?? '',
    procNm: row.procNm ?? '',
  };
}

export async function fetchMmsm06005Groups() {
  const qs = new URLSearchParams({ size: '1000' }).toString();
  const data = await http<{ content?: ProcGrpInfoResponse[] }>(`/api/v1/mdm/grp/search?${qs}`);
  return (Array.isArray(data.content) ? data.content : [])
    .filter(isProcRoutingGroup)
    .map(mapGroupRow);
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
    [grpCd, row.procCd ?? '', row.procNm ?? '']
      .map((value) => (value ?? '').toString().replace(/"/g, '""'))
      .map((value) => `"${value}"`)
      .join(',')
  );

  return [headers.join(','), ...lines].join('\n');
}
