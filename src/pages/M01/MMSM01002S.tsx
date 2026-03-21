import React, { useMemo, useRef, useState } from 'react';
import { MathGb, MathGbLabel } from '@/lib/types';
import { createEmptyPageResult } from '@/lib/pagination';
import CodePicker, { type CodePickerType } from '@/components/CodePicker';
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
  type Mmsm01002ListResult,
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
    mathGb: MathGb.ALL,
  });
  const [result, setResult] = useState<Mmsm01002ListResult>(() =>
    createEmptyPageResult(0, PAGE_SIZE)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picker, setPicker] = useState<null | { type: CodePickerType; title: string }>(null);

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
            code={form.cstCd}
            name={form.cstNm}
            codePlaceholder="코드"
            namePlaceholder="거래처 선택"
            onSearch={() => setPicker({ type: 'customer', title: '거래처 정보' })}
          />

          <div className="w-[300px] grid grid-cols-[100px_170px_1fr] items-center gap-2">
            <label className="text-sm text-gray-600">자재구분</label>
            <select
              value={form.mathGb}
              onChange={(e) =>
                setForm({
                  ...form,
                  mathGb: e.target.value as SearchForm['mathGb'],
                })
              }
              className="h-9 w-[170px] rounded-lg border px-2"
            >
              <option value={MathGb.ALL}>{MathGbLabel.ALL}</option>
              <option value={MathGb.A}>{MathGbLabel.A}</option>
              <option value={MathGb.B}>{MathGbLabel.B}</option>
              <option value={MathGb.C}>{MathGbLabel.C}</option>
            </select>
          </div>
        </div>

        <div className="mt-2">
          <MasterSearchField
            label="제품명"
            code={form.itemCd}
            name={form.itemNm}
            codePlaceholder="코드"
            namePlaceholder="제품 선택"
            onSearch={() => setPicker({ type: 'math', title: '원자재 검색' })}
          />
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={(e) => {
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

      {picker && (
        <CodePicker
          typeCode={picker.type}
          title={picker.title}
          onClose={() => setPicker(null)}
          onSelect={(v) => {
            if (picker.type === 'customer') {
              setForm((f) => ({ ...f, cstCd: v.code, cstNm: v.name }));
            } else {
              setForm((f) => ({ ...f, itemCd: v.code, itemNm: v.name }));
            }
          }}
        />
      )}
    </div>
  );
};

export default MMSM01002S;
