import React, { useMemo, useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import ExportCsvButton from '@/components/ExportCsvButton';
import ItemCodePicker from '@/components/ItemCodePicker';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { PAGE_SIZE } from '@/lib/pagination';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import {
  columns,
  exportHeaders,
  mapExportRow,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01004';

const MMSM01004S: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  const [form, setForm] = useState<SearchForm>({
    ivDate: today.toISOString().slice(0, 10),
    cstCd: '',
    cstNm: '',
    itemCd: '',
    itemNm: '',
  });

  const { result, loading, error, fetchList } = usePageApiFetch<SearchForm, RowItem>({
    apiPath: '/api/v1/material/ivdet/search',
    form,
    pageSize: PAGE_SIZE,
    includePageSizeParam: true,
    includeSizeParam: false,
    mapParams: ({ form: currentForm }) => ({
      ivYmd: currentForm.ivDate.split('-').join(''),
      cstCd: currentForm.cstCd || '',
      itemCd: currentForm.itemCd || '',
    }),
  });

  return (
    <div className="min-h-full bg-slate-50/60 p-4" ref={containerRef}>
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <SectionCard span="full" padding="md">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[446px_546px_1fr] xl:gap-12">
            <div className="w-[260px]">
              <div className="grid grid-cols-[96px_150px] items-center gap-3">
                <label className="text-sm text-gray-600">입고일자</label>
                <input
                  type="date"
                  value={form.ivDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, ivDate: e.target.value }))}
                  className="h-9 w-[150px] rounded-lg border px-2"
                />
              </div>
            </div>

            <CodeNameField
              label="거래처명"
              id="cust"
              code={form.cstCd}
              name={form.cstNm}
              codePlaceholder="코드"
              namePlaceholder="거래처 선택"
              onSearch={() => setCustomerOpen(true)}
              onClear={() => setForm((prev) => ({ ...prev, cstCd: '', cstNm: '' }))}
            />

            <div className="flex flex-wrap items-end justify-end gap-2">
              <button
                onClick={() => void fetchList(0)}
                className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '조회중...' : '조회'}
              </button>
              <ExportCsvButton
                rows={result.content}
                headers={exportHeaders}
                mapRow={mapExportRow}
                filename={() => `원자재입고현황_${form.ivDate.split('-').join('')}.csv`}
                variant="outline"
                className="h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 shadow-none transition hover:bg-emerald-100"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[546px_1fr]">
            <CodeNameField
              label="품목명"
              id="item"
              code={form.itemCd}
              name={form.itemNm}
              codePlaceholder="코드"
              namePlaceholder="원자재 선택"
              onSearch={() => setItemPickerOpen(true)}
              onClear={() => setForm((prev) => ({ ...prev, itemCd: '', itemNm: '' }))}
            />
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader
            title="입고 현황"
            right={
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {result.totalElements}건
              </span>
            }
          />
          <div className="max-h-[68vh] overflow-auto" style={{ height: tableHeight }}>
            <DataGrid
              dataSource={result.content}
              pageResult={result}
              rowKey={(row, index) =>
                `${row.ivYmd ?? 'iv'}-${row.ivSeq ?? 'seq'}-${row.inSubSeq ?? 'sub'}-${row.itemCd ?? 'item'}-${index}`
              }
              showBorders={true}
              loading={loading}
              remoteOperations={true}
              emptyText="입고 현황 데이터가 없습니다."
              onPageChange={(page) => void fetchList(page)}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              {columns.map((column, index) => (
                <Column
                  key={`${String(column.dataField)}-${index}`}
                  dataField={column.dataField}
                  caption={column.caption}
                  width={column.width}
                  alignment={column.alignment}
                  cellRender={column.cellRender}
                />
              ))}
            </DataGrid>
          </div>
        </SectionCard>

        {customerOpen ? (
          <CustomerCodePicker
            title="거래처 정보"
            custGb="CUSTOMER"
            cstCd={form.cstCd}
            cstNm={form.cstNm}
            onClose={() => setCustomerOpen(false)}
            onSelect={(value) => {
              setForm((prev) => ({ ...prev, cstCd: value.cstCd, cstNm: value.cstNm }));
            }}
          />
        ) : null}

        {itemPickerOpen ? (
          <ItemCodePicker
            title="원자재 정보"
            itemGb="RAW,SUB"
            itemNm={form.itemNm}
            onClose={() => setItemPickerOpen(false)}
            onSelect={(value) => {
              setForm((prev) => ({
                ...prev,
                itemCd: value.itemCd,
                itemNm: value.itemNm,
              }));
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

export default MMSM01004S;
