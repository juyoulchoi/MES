import React, { useEffect, useMemo, useRef, useState } from 'react';
import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import ExportCsvButton from '@/components/ExportCsvButton';
import FromToDateField from '@/components/FromToDateField';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import SearchCodePickers from '@/components/SearchCodePickers';
import { CheckColumn, Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { http } from '@/lib/http';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import { PAGE_SIZE } from '@/lib/pagination';
import {
  buildPurchaseCancelPayload,
  columns,
  exportHeaders,
  mapExportRow,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01002';
import { updateCheckedRows } from '@/pages/M01/registerDetailShared';
import type { AuthMeResponse } from '@/services/m01/mmsm01003';

const MMSM01002S: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const first = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [canceling, setCanceling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  const [form, setForm] = useState<SearchForm>({
    startDate: first.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    cstCd: '',
    cstNm: '',
    itemCd: '',
    itemNm: '',
    itemGb: '',
  });

  const { result, loading, error, fetchList } = usePageApiFetch<SearchForm, RowItem>({
    apiPath: '/api/v1/material/pomst/search',
    form,
    pageSize: PAGE_SIZE,
    mapParams: ({ form }) => ({
      poYmdS: form.startDate.split('-').join(''),
      poYmdE: form.endDate.split('-').join(''),
      cstCd: form.cstCd || '',
      itemCd: form.itemCd || '',
      itemGb: form.itemGb || '',
    }),
  });

  useEffect(() => {
    setRows(result.content.map((row) => ({ ...row, CHECK: false })));
  }, [result.content]);

  const displayResult = useMemo(
    () => ({
      ...result,
      content: rows,
    }),
    [result, rows]
  );

  function toggleRow(rowIndex: number, checked: boolean) {
    updateCheckedRows(setRows, rowIndex, checked);
  }

  async function onCancelPurchase() {
    const selectedRows = rows.filter((row) => row.CHECK);

    if (selectedRows.length === 0) {
      window.alert('발주 취소할 데이터를 선택하세요.');
      return;
    }

    if (selectedRows.some((row) => Number(row.ivQty ?? 0) > 0 || Number(row.preIvQty ?? 0) > 0)) {
      window.alert('입고 이력이 있는 발주는 취소할 수 없습니다.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedRows.length}건의 발주를 취소하시겠습니까?`)) return;

    setCanceling(true);

    try {
      const me = await http<AuthMeResponse>('/api/v1/auth/me');
      const userId = (
        me.user?.userid ??
        me.user?.userId ??
        me.data?.user?.userid ??
        me.data?.user?.userId ??
        ''
      ).trim();

      if (!userId) {
        window.alert('사용자 정보를 확인할 수 없습니다. 다시 로그인 후 시도하세요.');
        return;
      }

      const payloads = buildPurchaseCancelPayload(selectedRows, userId);
      await Promise.all(
        payloads.map((payload) =>
          http('/api/v1/material/pomst/savePayload', { method: 'POST', body: payload })
        )
      );

      await fetchList(result.page);
      window.alert('발주 취소되었습니다.');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50/60 p-4" ref={containerRef}>
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <SectionCard span="full" padding="md">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[446px_546px_1fr] xl:gap-12">
            <FromToDateField
              label="발주일자"
              fromValue={form.startDate}
              toValue={form.endDate}
              onFromChange={(value) => setForm({ ...form, startDate: value })}
              onToChange={(value) => setForm({ ...form, endDate: value })}
            />

            <CodeNameField
              label="거래처명"
              id="cust"
              code={form.cstCd}
              name={form.cstNm}
              codePlaceholder="코드"
              namePlaceholder="거래처 선택"
              onSearch={() => setCustomerOpen(true)}
              onClear={() =>
                setForm((prev) => ({ ...prev, cstCd: '', cstNm: '' }))
              }
            />

            <div className="flex flex-wrap items-end justify-end gap-2">
              <button
                onClick={() => {
                  fetchList(0);
                }}
                className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                disabled={loading || canceling}
              >
                {loading ? '조회중...' : '조회'}
              </button>
              <button
                onClick={() => void onCancelPurchase()}
                className="h-10 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                disabled={loading || canceling}
              >
                {canceling ? '취소중...' : '발주취소'}
              </button>
              <ExportCsvButton
                rows={rows}
                headers={exportHeaders}
                mapRow={mapExportRow}
                filename={() => `원자재발주현황_${form.endDate.split('-').join('')}.csv`}
                variant="outline"
                className="h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 shadow-none transition hover:bg-emerald-100"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[546px_1fr]">
            <CodeNameField
              label="원자재명"
              id="item"
              code={form.itemCd}
              name={form.itemNm}
              codePlaceholder="코드"
              namePlaceholder="원자재 선택"
              onSearch={() => setItemPickerOpen(true)}
              onClear={() =>
                setForm((prev) => ({ ...prev, itemGb: '', itemCd: '', itemNm: '' }))
              }
            />
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader
            title="원자재 발주현황"
            right={
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {result.totalElements}건
              </span>
            }
          />
          <div className="max-h-[68vh] overflow-auto" style={{ height: tableHeight }}>
            <DataGrid
              dataSource={rows}
              pageResult={displayResult}
              rowKey={(row, index) => `${row.poYmd ?? 'po'}-${row.poSeq ?? 'seq'}-${row.poSubSeq ?? 'sub'}-${row.itemCd ?? 'item'}-${index}`}
              showBorders={true}
              loading={loading}
              remoteOperations={true}
              emptyText="원자재 발주현황 데이터가 없습니다."
              onPageChange={(page) => void fetchList(page)}
              classNames={{
                table: 'min-w-[1480px] w-full text-sm',
              }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              <CheckColumn
                checked={(row) => !!row.CHECK}
                onChange={(_row, rowIndex, checked) => toggleRow(rowIndex, checked)}
              />
              {columns.map((column, index) => (
                <Column
                  key={`${String(column.dataField)}-${index}`}
                  dataField={column.dataField}
                  caption={column.caption}
                  width={column.width}
                  alignment={column.alignment}
                  headerAlignment={column.headerAlignment}
                  headerClassName={column.headerClassName}
                  cellRender={column.cellRender}
                />
              ))}
            </DataGrid>
          </div>
        </SectionCard>

        <SearchCodePickers
          customer={{
            open: customerOpen,
            title: '거래처 정보',
            custGb: 'SUPPLIER',
            cstCd: form.cstCd,
            cstNm: form.cstNm,
            onClose: () => setCustomerOpen(false),
            onSelect: (value) => {
              setForm((prev) => ({ ...prev, cstCd: value.cstCd, cstNm: value.cstNm }));
            },
          }}
          item={{
            open: itemPickerOpen,
            title: '원자재 정보',
            itemGb: 'RAW,SUB',
            itemNm: form.itemNm,
            onClose: () => setItemPickerOpen(false),
            onSelect: (value) => {
              setForm((prev) => ({
                ...prev,
                itemGb: value.itemgb,
                itemCd: value.itemCd,
                itemNm: value.itemNm,
              }));
            },
          }}
        />
      </div>
    </div>
  );
};

export default MMSM01002S;

