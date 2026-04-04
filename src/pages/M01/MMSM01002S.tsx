import React, { useMemo, useRef, useState } from 'react';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import ItemCodePicker from '@/components/ItemCodePicker';
import CommonCodeSelectBox from '@/components/CommonCodeSelectBox';
import ExportCsvButton from '@/components/ExportCsvButton';
import CodeNameField from '@/components/CodeNameField';
import FromToDateField from '@/components/FromToDateField';
import { Column, DataGrid } from '@/components/table/DataGrid';
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
    <div className="flex h-full flex-col gap-3 p-4" ref={containerRef}>
      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="grid [grid-template-columns:600px_600px_300px_1fr] gap-2 items-end">
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
        </div>

        <div className="mt-2">
          <CodeNameField
            label="제품명"
            id="cust"
            code={form.itemCd}
            name={form.itemNm}
            codePlaceholder="코드"
            namePlaceholder="제품 선택"
            onSearch={() => setitemPickerOpen(true)}
          />
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => {
              fetchList(0);
            }}
            className="rounded-xl border bg-white px-4 py-2 shadow-sm hover:bg-gray-50 active:scale-[0.99]"
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
            className="rounded-xl shadow-sm active:scale-[0.99]"
          />
        </div>
      </div>

      {error && (
        <div className="rounded border border-destructive/30 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="max-w-full overflow-auto" style={{ height: tableHeight }}>
          <DataGrid dataSource={result.content} keyExpr="itemCd" showBorders={true}>
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
      </div>

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
  );
};

export default MMSM01002S;
