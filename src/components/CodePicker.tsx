import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { getApi } from '@/lib/axiosClient';
import { LabeledInput } from '@/components/ui/labeled-input';
import { toPageResult, type PageResult, createEmptyPageResult } from '@/lib/pagination';

export type CodeItem = { code: string; name: string };
type ResultRow = PageResult<CodeItem>;
const PAGE_SIZE = 10;

export interface CodePickerProps {
  title: string;
  onSelect: (v: CodeItem) => void;
  onClose: () => void;
  code: string;
  name: string;
  pageable?: string;
}

type SearchForm = {
  searchCode?: string;
  searchName?: string;
  status?: string;
  pageable?: string;
};

async function fetchtems(form: SearchForm, page = 0, size = PAGE_SIZE): Promise<ResultRow> {
  const data = await getApi<unknown>('/api/v1/mdm/cust/searchCustList', {
    searchCode: form.searchCode,
    searchName: form.searchName,
    status: 'ACTIVE',
    pageable: form.pageable,
    page: String(page),
    size: String(size),
  });
  return toPageResult(data, page, size);
}

export default function CodePicker({
  title,
  onSelect,
  onClose,
  code,
  name,
  pageable,
}: CodePickerProps) {
  const [searchName, setSearchName] = useState(name ?? '');
  const [result, setResult] = useState<ResultRow>(() => createEmptyPageResult(0, PAGE_SIZE));
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SearchForm>({
    searchCode: code,
    searchName: name,
  });
  useEffect(() => {
    setSearchName(name ?? '');
    setError(null);
    setLoaded(false);
  }, [name]);

  const searchCustomers = useCallback(
    async (nextName: string) => {
      setLoading(true);
      setError(null);

      try {
        setResult(await fetchtems(form, 0, 10));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoaded(true);
        setLoading(false);
      }
    },
    [name]
  );

  const emptyMessage = '데이터가 없습니다.';

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
              id="txtName"
              label="검색명"
              value={name}
              wrapperClassName="grid grid-cols-[140px_1fr] items-center gap-3"
              labelClassName="text-sm text-gray-600"
              inputClassName="h-10 rounded-xl border px-3 outline-none focus:ring"
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void searchCustomers(name);
              }}
            />
            <button
              type="button"
              className="h-10 rounded-xl border px-4 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => void searchCustomers(name)}
              disabled={loading}
            >
              {loading ? '조회중...' : '조회'}
            </button>
          </div>
        </div>

        {error ? <div className="px-4 pt-4 text-sm text-red-600">{error}</div> : null}

        <div className="overflow-auto px-4 pb-4 pt-4">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left">대표자명</th>
                <th className="px-2 py-2 text-left">거래처코드</th>
                <th className="px-2 py-2 text-left">거래처명</th>
                <th className="px-2 py-2 text-left">사업자번호</th>
                <th className="w-24 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {/* {result.content.map((row) => (
                <tr key={`${row.cstCd}_${row.cstNm}_${row.regNo}`} className="border-t">
                  <td className="px-2 py-2">{row.ceoNm}</td>
                  <td className="px-2 py-2">{row.cstCd}</td>
                  <td className="px-2 py-2">{row.cstNm}</td>
                  <td className="px-2 py-2">{row.regNo}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      className="rounded-lg border px-3 py-1 hover:bg-gray-50"
                      onClick={() => {
                        onSelect(row);
                        onClose();
                      }}
                    >
                      선택
                    </button>
                  </td>
                </tr>
              ))} */}
              {result.content.length == 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-sm text-gray-400">
                    {loading ? '거래처 목록을 불러오는 중...' : emptyMessage}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
