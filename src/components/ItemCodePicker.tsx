import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { type PageResult, EmptyPageResult, PAGE_SIZE } from '@/lib/pagination';
import { getApiFetch, type PageFetchRequest } from '@/services/common/getApiFetch';
import PopupGrid from '@/components/PopupGrid';
import type { TableColumn } from '@/components/table/BaseTable';

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

export type MaterialCodePickerItem = RowItem;

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

  const search = useCallback(
    async (nextCode: string, nextName: string, nextPage = 0) => {
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

    void search(initialCode, initialName);
  }, [itemCd, itemNm, itemGb, search]);

  const columns = useMemo<TableColumn<RowItem>[]>(
    () => [
      { key: 'itemCd', header: '코드', accessor: 'itemCd' },
      { key: 'itemNm', header: '이름', accessor: 'itemNm' },
      { key: 'itemGbNm', header: '구분', accessor: 'itemGbNm' },
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
    ? '원자재 목록을 불러오는 중...'
    : loaded
      ? '조회된 원자재가 없습니다.'
      : '원자재 목록을 불러오는 중...';

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
                  if (e.key === 'Enter') void search(itemCode, itemName);
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
                  if (e.key === 'Enter') void search(itemCode, itemName);
                }}
                placeholder="원자재명"
                className="h-10 w-full rounded-xl border px-3 outline-none focus:ring"
              />
            </label>
            <div />
            <button
              type="button"
              className="h-10 rounded-xl border px-4 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => void search(itemCode, itemName)}
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
          rowKey={(row) => `${row.itemCd}_${row.itemNm}`}
          emptyText={emptyMessage}
          loading={loading}
          onPageChange={(page) => void search(itemCode, itemName, page)}
        />
      </div>
    </div>
  );
}
