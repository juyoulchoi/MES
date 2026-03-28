import { getApi } from '@/lib/axiosClient';
import { toPageResult, type PageResult, PAGE_SIZE } from '@/lib/pagination';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

export interface PageFetchRequest<TForm> {
  form: TForm;
  page: number;
  pageSize: number;
}

interface ApiFetchOption<TForm> {
  apiPath: string;
  mapParams: (request: PageFetchRequest<TForm>) => QueryParams;
}

export function getApiFetch<TForm, TRow>({ apiPath, mapParams }: ApiFetchOption<TForm>) {
  return async (request: PageFetchRequest<TForm>): Promise<PageResult<TRow>> => {
    const page = request.page ?? 0;
    const size = request.pageSize ?? PAGE_SIZE;
    const data = await getApi<unknown>(apiPath, {
      ...mapParams(request),
      page: String(page),
      size: String(size),
    });

    return toPageResult<TRow>(data, page, size);
  };
}
