import { getApi } from '@/lib/axiosClient';
import { toPageResult, type PageResult, PAGE_SIZE } from '@/lib/pagination';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

interface ApiFetchOption<TForm> {
  apiPath: string;
  mapParams: (form: TForm) => QueryParams;
}

export function getApiFetch<TForm, TRow>({ apiPath, mapParams }: ApiFetchOption<TForm>) {
  return async (form: TForm, page = 0, size = PAGE_SIZE): Promise<PageResult<TRow>> => {
    const data = await getApi<unknown>(apiPath, {
      ...mapParams(form),
      page: String(page),
      size: String(size),
    });

    return toPageResult<TRow>(data, page, size);
  };
}
