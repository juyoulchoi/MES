import React, { useMemo, useRef, useState } from 'react';
import { createEmptyPageResult } from '@/lib/pagination';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import MaterialCodePicker from '@/components/MaterialCodePicker';
import CommonCodeSelectBox from '@/components/CommonCodeSelectBox';
import ExportCsvButton from '@/components/ExportCsvButton';
import MasterSearchField from '@/components/MasterSearchField';
import FromToDateSearchField from '@/components/FromToDateSearchField';
import { BaseTable } from '@/components/table/BaseTable';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import {
  columns,
  fetchMmsm01002List as onSearch,
  tableClassNames,
  exportHeaders,
  mapExportRow,
  type ListResult,
  type SearchForm,
} from '@/services/m01/mmsm01002';

const PAGE_SIZE = 10;

const MMSM01002S: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const first = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);

  const [form, setForm] = useState<SearchForm>({
    startDate: first.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    cstCd: '',
    cstNm: '',
    itemCd: '',
    itemNm: '',
    itemGb: '',
  });

  const [result, setResult] = useState<ListResult>(() => createEmptyPageResult(0, PAGE_SIZE));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  const fetchList = async (nextPage = 0) => {
    setLoading(true);
    setError(null);
    try {
      setResult(await onSearch(form, nextPage, PAGE_SIZE));
    } catch (e) {
      setResult(createEmptyPageResult(nextPage, PAGE_SIZE));
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4" ref={containerRef}>
      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="grid [grid-template-columns:600px_600px_300px_1fr] gap-2 items-end">
          <FromToDateSearchField
            label="요청일자"
            fromValue={form.startDate}
            toValue={form.endDate}
            onFromChange={(value) => setForm({ ...form, startDate: value })}
            onToChange={(value) => setForm({ ...form, endDate: value })}
          />

          <MasterSearchField
            label="거래처명"
            id="cust"
            code={form.cstCd}
            name={form.cstNm}
            codePlaceholder="코드"
            namePlaceholder="거래처 선택"
            onSearch={() => setCustomerOpen(true)}
          />

          <div className="w-[300px] grid grid-cols-[100px_170px_1fr] items-center gap-2">
            <label className="text-sm text-gray-600">자재구분</label>
            <CommonCodeSelectBox
              codeGroup="ITEM_GB"
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
        </div>

        <div className="mt-2">
          <MasterSearchField
            label="제품명"
            id="cust"
            code={form.itemCd}
            name={form.itemNm}
            codePlaceholder="코드"
            namePlaceholder="제품 선택"
            onSearch={() => setMaterialPickerOpen(true)}
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
          <BaseTable
            pageResult={result}
            columns={columns}
            rowKey={(row, i) => row.rnum ?? i}
            classNames={tableClassNames}
            emptyText="데이터가 없습니다. 조건을 변경하고 조회를 눌러주세요."
            pagination={{
              result,
              loading,
              onPageChange: fetchList,
            }}
          />
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

      {materialPickerOpen ? (
        <MaterialCodePicker
          title="원자재 정보"
          itemGb="RAW"
          itemCd={form.itemCd}
          itemNm={form.itemNm}
          onClose={() => setMaterialPickerOpen(false)}
          onSelect={(value) => {
            setForm((prev) => ({ ...prev, itemCd: value.code, itemNm: value.name }));
          }}
        />
      ) : null}
    </div>
  );
};

export default MMSM01002S;
