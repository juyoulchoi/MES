import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { LabeledInput } from '@/components/ui/labeled-input';
import { EmptyPageResult, PAGE_SIZE, type PageResult } from '@/lib/pagination';
import { getApiFetch, type PageFetchRequest } from '@/services/common/getApiFetch';
import type { TableColumn } from '@/components/table/BaseTable';
import PopupGrid from '@/components/PopupGrid';

type RowItem = { codeCd: string; codeNm: string };

type SearchForm = {
  grpCd: string;
  codeCd?: string;
  codeNm?: string;
  status?: string;
};

type ResultList = PageResult<RowItem>;

export interface CommonCodePickerProps {
  title: string;
  onSelect: (v: RowItem) => void;
  onClose: () => void;
  grpCd: string;
  codeCd: string;
  codeNm: string;
}

const fetchList = getApiFetch<SearchForm, RowItem>({
  apiPath: '/api/v1/mdm/code/comcode',
  mapParams: ({ form }: PageFetchRequest<SearchForm>) => ({
    grpCd: form.grpCd,
    code: form.codeCd,
    name: form.codeNm,
    status: 'ACTIVE',
  }),
});

export default function CommonCodePicker({
  title,
  grpCd,
  codeCd,
  codeNm,
  onSelect,
  onClose,
}: CommonCodePickerProps) {
  const [searchCd, setSearchCd] = useState(codeCd ?? '');
  const [searchNm, setSearchNm] = useState(codeNm ?? '');
  const [result, setResult] = useState<ResultList>(() => EmptyPageResult(0, PAGE_SIZE));
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCommonCode = useCallback(
    async (nextCode: string, nextName: string, nextPage = 0) => {
      setLoading(true);
      setError(null);

      try {
        setResult(
          await fetchList({
            form: {
              grpCd,
              codeCd: nextCode,
              codeNm: nextName,
            },
            page: nextPage,
            pageSize: PAGE_SIZE,
          })
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoaded(true);
        setLoading(false);
      }
    },
    [grpCd]
  );

  useEffect(() => {
    const initialCode = codeCd ?? '';
    const initialName = codeNm ?? '';

    setSearchCd(initialCode);
    setSearchNm(initialName);
    setError(null);
    setLoaded(false);
    setResult(EmptyPageResult(0, PAGE_SIZE));

    void searchCommonCode(initialCode, initialName);
  }, [grpCd, codeCd, codeNm, searchCommonCode]);

  const columns = useMemo<TableColumn<RowItem>[]>(
    () => [
      { key: 'cstCd', header: '코드' },
      { key: 'cstNm', header: '코드명' },
      {
        key: 'select',
        header: '',
        width: 96,
        align: 'right',
        render: (row) => (
          <button
            className="rounded-lg border px-3 py-1 hover:bg-gray-50"
            onClick={() => {
              onSelect(row);
              onClose();
            }}
          >
            선택
          </button>
        ),
      },
    ],
    [onClose, onSelect]
  );

  const emptyMessage = loading
    ? '거래처 목록을 불러오는 중...'
    : loaded
      ? '조회된 거래처가 없습니다.'
      : '거래처 목록을 불러오는 중...';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex max-h-[560px] w-[760px] flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="rounded-full p-1 hover:bg-gray-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="border-b p-4">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <LabeledInput
              id="txtCode"
              label="검색코드"
              value={searchCd}
              wrapperClassName="grid grid-cols-[140px_1fr] items-center gap-3"
              labelClassName="text-sm text-gray-600"
              inputClassName="h-10 rounded-xl border px-3 outline-none focus:ring"
              onChange={(e) => setSearchCd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void searchCommonCode(searchCd, searchNm);
              }}
            />
            <LabeledInput
              id="txtName"
              label="검색명"
              value={searchNm}
              wrapperClassName="grid grid-cols-[140px_1fr] items-center gap-3"
              labelClassName="text-sm text-gray-600"
              inputClassName="h-10 rounded-xl border px-3 outline-none focus:ring"
              onChange={(e) => setSearchNm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void searchCommonCode(searchCd, searchNm);
              }}
            />
            <button
              type="button"
              className="h-10 rounded-xl border px-4 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => void searchCommonCode(searchCd, searchNm)}
              disabled={loading}
            >
              {loading ? '조회중...' : '조회'}
            </button>
          </div>
        </div>

        {error ? <div className="px-4 pt-4 text-sm text-red-600">{error}</div> : null}

        <PopupGrid
          result={result}
          columns={columns}
          rowKey={(row) => `${row.codeCd}`}
          emptyText={emptyMessage}
          loading={loading}
          onPageChange={(page) => void searchCommonCode(searchCd, searchNm, page)}
        />
      </div>
    </div>
  );
}
