import { getApi } from '@/lib/axiosClient';

export type CommonCodeItem = {
  code: string;
  name: string;
};

export type FetchCommonCodeParams = {
  apiPath?: string;
  groupCode?: string;
  extraParams?: Record<string, string>;
};

export async function fetchCommonCodes({
  apiPath = '/api/v1/mdm/code/comcode',
  groupCode,
  extraParams = {},
}: FetchCommonCodeParams): Promise<CommonCodeItem[]> {
  const params: Record<string, string> = { ...extraParams };
  if (groupCode) params['grpCd'] = groupCode;

  const rows = await getApi<Record<string, unknown>[]>(apiPath, params);

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    code: String(row['codeCd']),
    name: String(row['codeNm']),
  }));
}
