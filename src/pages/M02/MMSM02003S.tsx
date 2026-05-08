import { useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import FromToDateField from '@/components/FromToDateField';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import StatusActionButtons from '@/components/StatusActionButtons';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { http } from '@/lib/http';
import { PAGE_SIZE } from '@/lib/pagination';
import { gridScrollClass, pageContentClass, pageShellClass } from '@/lib/pageStyles';
import { getTodayYmd } from '@/lib/registerDetailUtils';
import {
  columns,
  exportHeaders,
  mapExportRow,
  normalizeRows,
  toYmd,
  type ApiRow,
  type RowItem,
  type SearchForm,
} from '@/services/m02/mmsm02003';

function getFirstDayOfMonthYmd() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

const searchLabelClass = 'font-medium text-slate-700';
const searchControlClass = 'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm';

export default function MMSM02003S() {
  const [form, setForm] = useState<SearchForm>({
    startDate: getFirstDayOfMonthYmd(),
    endDate: getTodayYmd(),
    proc: '',
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
        start: toYmd(form.startDate),
        end: toYmd(form.endDate),
        proc: form.proc,
      }).toString();
      const data = await http<ApiRow[]>(`/api/v1/planning/productionStatus/search?${qs}`);
      setRows(normalizeRows(Array.isArray(data) ? data : []));
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={pageShellClass} ref={containerRef}>
      <div className={pageContentClass}>
        <SectionCard span="full" padding="md">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[450px_260px_1fr]">
            <FromToDateField
              label="수주일자"
              fromValue={form.startDate}
              toValue={form.endDate}
              onFromChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
              onToChange={(value) => setForm((prev) => ({ ...prev, endDate: value }))}
            />

            <label className="flex h-10 items-center gap-2 text-sm">
              <span className={`${searchLabelClass} w-[72px] shrink-0`}>공정</span>
              <input
                className={`${searchControlClass} w-full`}
                value={form.proc}
                onChange={(event) => setForm((prev) => ({ ...prev, proc: event.target.value }))}
                placeholder="공정코드/명"
              />
            </label>

            <StatusActionButtons
              loading={loading}
              onSearch={() => void onSearch()}
              exportProps={{
                rows,
                headers: exportHeaders,
                mapRow: mapExportRow,
                filename: () => `생산현황_${toYmd(form.startDate)}_${toYmd(form.endDate)}.csv`,
              }}
            />
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader title="생산 현황" />
          <div className={gridScrollClass} style={{ height: tableHeight }}>
            <DataGrid
              dataSource={rows}
              rowKey={(row, index) => `${row.workYmd ?? 'date'}-${row.itemNm ?? 'item'}-${index}`}
              showBorders={true}
              loading={loading}
              emptyText="생산 현황 데이터가 없습니다. 조건 선택 후 조회하세요."
              classNames={{
                table: 'min-w-[1020px] w-full text-sm',
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
