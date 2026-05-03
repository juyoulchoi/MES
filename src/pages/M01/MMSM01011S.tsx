import { useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import ExportCsvButton from '@/components/ExportCsvButton';
import FromToDateField from '@/components/FromToDateField';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { http } from '@/lib/http';
import { PAGE_SIZE } from '@/lib/pagination';
import {
  columns,
  exportHeaders,
  mapExportRow,
  normalizeRows,
  toYmd,
  type ApiRow,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01011';

function getTodayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function getFirstDayOfMonthYmd() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

export default function MMSM01011S() {
  const [form, setForm] = useState<SearchForm>({
    startDate: getFirstDayOfMonthYmd(),
    endDate: getTodayYmd(),
  });
  const [rows, setRows] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({
        giYmdS: toYmd(form.startDate),
        giYmdE: toYmd(form.endDate),
      }).toString();
      const data = await http<ApiRow[]>(`/api/v1/mdm/stkmst/searchStkMstDetList?${qs}`);
      setRows(normalizeRows(Array.isArray(data) ? data : []));
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50/60 p-4" ref={containerRef}>
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <SectionCard span="full" padding="md">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[450px_1fr]">
            <FromToDateField
              label="실사일자"
              fromValue={form.startDate}
              toValue={form.endDate}
              onFromChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
              onToChange={(value) => setForm((prev) => ({ ...prev, endDate: value }))}
            />

            <div className="flex flex-wrap items-end justify-end gap-2">
              <button
                onClick={() => void onSearch()}
                className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '조회중...' : '조회'}
              </button>
              <ExportCsvButton
                rows={rows}
                headers={exportHeaders}
                mapRow={mapExportRow}
                filename={() => `원자재재고조정내역_${toYmd(form.startDate)}_${toYmd(form.endDate)}.csv`}
                variant="outline"
                className="h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 shadow-none transition hover:bg-emerald-100"
              />
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader
            title="원자재 재고조정 내역"
            right={
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {rows.length}건
              </span>
            }
          />
          <div className="max-h-[68vh] overflow-auto" style={{ height: tableHeight }}>
            <DataGrid
              dataSource={rows}
              rowKey={(row, index) => `${row.ymd ?? 'date'}-${row.itemCd ?? 'item'}-${index}`}
              showBorders={true}
              loading={loading}
              emptyText="원자재 재고조정 내역 데이터가 없습니다."
              classNames={{
                table: 'min-w-[1420px] w-full text-sm',
              }}
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
                  headerAlignment={column.headerAlignment}
                  headerClassName={column.headerClassName}
                  cellRender={column.cellRender}
                />
              ))}
            </DataGrid>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
