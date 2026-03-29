import PopupGrid from '@/components/PopupGrid';
import type { TableColumn } from '@/components/table/BaseTable';
import { LabeledInput } from '@/components/ui/labeled-input';
import { EmptyPageResult, PAGE_SIZE, type PageResult } from '@/lib/pagination';
import { getApiFetch, type PageFetchRequest } from '@/services/common/getApiFetch';
import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';

type RowItem = {
  ceoNm: string;
  cstCd: string;
  cstNm: string;
  regNo: string;
};

export type CustomerCodePickerItem = RowItem;

type SearchForm = {
  custGb?: string;
  cstNm?: string;
};

type ResultList = PageResult<RowItem>;

interface CustomerCodePickerProps {
  title: string;
  onSelect: (value: RowItem) => void;
  onClose: () => void;
  custGb?: string;
  cstCd?: string;
  cstNm?: string;
}

const fetchList = getApiFetch<SearchForm, RowItem>({
  apiPath: '/api/v1/mdm/cust/search',
  mapParams: ({ form }: PageFetchRequest<SearchForm>) => ({
    custGb: form.custGb,
    cstNm: form.cstNm,
    status: 'ACTIVE',
  }),
});

export default function CustomerCodePicker({
  title,
  custGb,
  cstNm,
  onSelect,
  onClose,
}: CustomerCodePickerProps) {
  const [customerName, setCustomerName] = useState(cstNm ?? '');
  const [result, setResult] = useState<ResultList>(() => EmptyPageResult(0, PAGE_SIZE));
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSearchKeyRef = useRef<string>('');

  const selectRow = useCallback(
    (row: RowItem) => {
      onSelect(row);
      onClose();
    },
    [onClose, onSelect]
  );

  const search = useCallback(
    async (nextName: string, nextPage = 0) => {
      setLoading(true);
      setError(null);

      try {
        setResult(
          await fetchList({
            form: {
              custGb,
              cstNm: nextName,
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
    [custGb]
  );

  useEffect(() => {
    const initialName = cstNm ?? '';

    setCustomerName(initialName);
    setError(null);
    setLoaded(false);
    setResult(EmptyPageResult(0, PAGE_SIZE));
    const searchKey = `${cstNm}:${initialName}`;

    if (lastSearchKeyRef.current === searchKey) return;
    lastSearchKeyRef.current = searchKey;

    void search(initialName);
  }, [cstNm, custGb, search]);

  const columns = useMemo<TableColumn<RowItem>[]>(
    () => [
      { key: 'ceoNm', header: '대표자명', accessor: 'ceoNm' },
      { key: 'cstCd', header: '거래처코드', accessor: 'cstCd' },
      { key: 'cstNm', header: '거래처명', accessor: 'cstNm' },
      { key: 'regNo', header: '사업자번호', accessor: 'regNo' },
      {
        key: 'select',
        header: '',
        width: 96,
        align: 'right',
        render: (row) => (
          <button
            className="rounded-lg border px-3 py-1 hover:bg-gray-50"
            onClick={() => selectRow(row)}
          >
            선택
          </button>
        ),
      },
    ],
    [selectRow]
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
              id="txtCustNm"
              label="거래처명"
              value={customerName}
              wrapperClassName="grid grid-cols-[140px_1fr] items-center gap-3"
              labelClassName="text-sm text-gray-600"
              inputClassName="h-10 rounded-xl border px-3 outline-none focus:ring"
              onChange={(e) => setCustomerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void search(customerName);
              }}
            />
            <button
              type="button"
              className="h-10 rounded-xl border px-4 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => void search(customerName)}
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
          rowKey={(row) => `${row.cstCd}_${row.cstNm}_${row.regNo}`}
          emptyText={emptyMessage}
          loading={loading}
          onPageChange={(page) => void search(customerName, page)}
          getRowProps={(row) => ({
            onDoubleClick: () => selectRow(row),
            className: 'cursor-pointer',
          })}
        />
      </div>
    </div>
  );
}
