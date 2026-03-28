import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { type PageResult, EmptyPageResult, PAGE_SIZE } from '@/lib/pagination';
import { getApiFetch, type PageFetchRequest } from '@/services/common/getApiFetch';

type RowItem = {
  itemCd: string;
  itemNm: string;
  itemgb: string;
  itemGbNm: string;
  unitCd: string;
  obtGb: string;
  obtNm: string;
  status: string;
};

type SearchForm = {
  itemGb?: string;
  itemCd?: string;
  itemNm?: string;
};

type ResultList = PageResult<RowItem>;

interface ItemCodePickerProps {
  title: string;
  onSelect: (value: RowItem) => void;
  onClose: () => void;
  itemGb: 'FG' | 'SFG' | 'RAW' | 'SUB';
  itemCd?: string;
  itemNm?: string;
}

const fetchList = getApiFetch<SearchForm, RowItem>({
  apiPath: '/api/v1/mdm/iteminfo/searchProductInfoList',
  mapParams: ({ form }: PageFetchRequest<SearchForm>) => ({
    itemCd: form.itemCd,
    itemNm: form.itemNm,
    itemgb: form.itemGb,
    status: 'ACTIVE',
  }),
});

export default function ItemInfoCodePicker({
  title,
  itemGb,
  itemCd,
  itemNm,
  onSelect,
  onClose,
}: ItemCodePickerProps) {
  const [itemCode, setItemCode] = useState(itemCd ?? '');
  const [itemName, setItemName] = useState(itemNm ?? '');
  const [result, setResult] = useState<ResultList>(() => EmptyPageResult(0, PAGE_SIZE));
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchItems = useCallback(
    async (nextCode: string, nextName: string) => {
      setLoading(true);
      setError(null);

      try {
        setResult(
          await fetchList({
            form: {
              itemGb,
              itemCd: nextCode,
              itemNm: nextName,
            },
            page: 0,
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
    [itemGb]
  );

  useEffect(() => {
    const initialCode = itemCd ?? '';
    const initialName = itemNm ?? '';

    setItemCode(initialCode);
    setItemName(initialName);
    setError(null);
    setLoaded(false);
    setResult(EmptyPageResult(0, PAGE_SIZE));

    void searchItems(initialCode, initialName);
  }, [itemCd, itemNm, itemGb, searchItems]);

  const emptyMessage = loaded ? '조회된 원자재가 없습니다.' : '원자재 목록을 불러오는 중...';

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
          <div className="grid grid-cols-[140px_1fr_140px_1fr_auto] items-end gap-3">
            <label className="text-sm text-gray-600">
              <span className="mb-1 block">원자재코드</span>
              <input
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void searchItems(itemCode, itemName);
                }}
                placeholder="원자재코드"
                className="h-10 w-full rounded-xl border px-3 outline-none focus:ring"
              />
            </label>
            <div />
            <label className="text-sm text-gray-600">
              <span className="mb-1 block">원자재명</span>
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void searchItems(itemCode, itemName);
                }}
                placeholder="원자재명"
                className="h-10 w-full rounded-xl border px-3 outline-none focus:ring"
              />
            </label>
            <div />
            <button
              type="button"
              className="h-10 rounded-xl border px-4 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => void searchItems(itemCode, itemName)}
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
                <th className="px-2 py-2 text-left">코드</th>
                <th className="px-2 py-2 text-left">이름</th>
                <th className="w-24 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {result.content.map((row) => (
                <tr key={`${row.itemCd}_${row.itemNm}`} className="border-t">
                  <td className="px-2 py-2">{row.itemCd}</td>
                  <td className="px-2 py-2">{row.itemNm}</td>
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
              ))}
              {result.content.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-8 text-center text-sm text-gray-400">
                    {loading ? '원자재 목록을 불러오는 중...' : emptyMessage}
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
