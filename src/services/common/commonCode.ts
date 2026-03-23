import { getApi } from '@/lib/axiosClient';

export type CommonCodeItem = {
  code: string;
  name: string;
  raw?: Record<string, unknown>;
};

export type FetchCommonCodeParams = {
  apiPath?: string;
  groupCode?: string;
  extraParams?: Record<string, string>;
};

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return '';
}

export async function fetchCommonCodes({
  apiPath = '/api/v1/mdm/code/comcode',
  groupCode,
  extraParams = {},
}: FetchCommonCodeParams): Promise<CommonCodeItem[]> {
  const params: Record<string, string> = { ...extraParams };
  if (groupCode) params.grpCd = groupCode;

  const rows = await getApi<Record<string, unknown>[]>(apiPath, params);

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    code: pickString(row, ['codeCd', 'code', 'id']),
    name: pickString(row, ['codeNm', 'name', 'text']),
    raw: row,
  }));
}
