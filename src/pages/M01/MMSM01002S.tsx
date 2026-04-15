import React, { useMemo, useRef, useState } from 'react';
import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import CommonCodeSelectBox from '@/components/CommonCodeSelectBox';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import ExportCsvButton from '@/components/ExportCsvButton';
import FromToDateField from '@/components/FromToDateField';
import ItemCodePicker from '@/components/ItemCodePicker';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import { PAGE_SIZE } from '@/lib/pagination';
import {
  columns,
  exportHeaders,
  mapExportRow,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01002';

const MMSM01002S: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const first = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemPickerOpen, setitemPickerOpen] = useState(false);
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

  return (
    <div className="min-h-full bg-slate-50/60 p-4" ref={containerRef}>
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <SectionCard span="full" padding="md">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[440px_440px_280px_1fr]">
            <FromToDateField
              label="요청일자"
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

            <CommonCodeSelectBox
              codeGroup="ITEM"
              label="자재구분"
              showAllOption={true}
              searchEnabled={false}
              onValueChange={(value) =>
                setForm({
                  ...form,
                  itemGb: String(value),
                })
              }
            />

            <div className="flex flex-wrap items-end justify-end gap-2">
              <button
                onClick={() => {
                  fetchList(0);
                }}
                className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '조회중...' : '조회'}
              </button>
              <ExportCsvButton
                rows={result.content}
                headers={exportHeaders}
                mapRow={mapExportRow}
                filename={() => `원자재발주현황_${form.endDate.split('-').join('')}.csv`}
                variant="outline"
                className="h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 shadow-none transition hover:bg-emerald-100"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[440px_1fr]">
            <CodeNameField
              label="제품명"
              id="item"
              code={form.itemCd}
              name={form.itemNm}
              codePlaceholder="코드"
              namePlaceholder="제품 선택"
              onSearch={() => setitemPickerOpen(true)}
              onClear={() =>
                setForm((prev) => ({ ...prev, itemGb: '', itemCd: '', itemNm: '' }))
              }
            />
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader
            title="발주 현황"
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
              rowKey={(row, index) => `${row.poYmd ?? 'po'}-${row.poSeq ?? 'seq'}-${row.poSubSeq ?? 'sub'}-${row.itemCd ?? 'item'}-${index}`}
              showBorders={true}
              loading={loading}
              remoteOperations={true}
              emptyText="발주 현황 데이터가 없습니다."
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
            onClose={() => setitemPickerOpen(false)}
            onSelect={(value) => {
              setForm((prev) => ({
                ...prev,
                itemGb: value.itemgb,
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

export default MMSM01002S;

