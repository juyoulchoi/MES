import { useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import ExportCsvButton from '@/components/ExportCsvButton';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import SearchCodePickers from '@/components/SearchCodePickers';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { http } from '@/lib/http';
import { PAGE_SIZE } from '@/lib/pagination';
import {
  columns,
  exportHeaders,
  mapExportRow,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01009';

export default function MMSM01009S() {
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [form, setForm] = useState<SearchForm>({
    itemCd: '',
    itemNm: '',
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
        itemCd: form.itemCd,
        itemNm: form.itemNm,
      }).toString();
      const data = await http<RowItem[]>(`/api/v1/planning/prditemuse/searchUseHistory?${qs}`);
      setRows(Array.isArray(data) ? data : []);
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
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[546px_1fr]">
            <CodeNameField
              label="원자재명"
              id="item"
              code={form.itemCd}
              name={form.itemNm}
              codePlaceholder="코드"
              namePlaceholder="원자재 선택"
              onSearch={() => setItemPickerOpen(true)}
              onClear={() => setForm({ itemCd: '', itemNm: '' })}
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
                filename="원자재투입이력현황.csv"
                variant="outline"
                className="h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 shadow-none transition hover:bg-emerald-100"
              />
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader
            title="원자재 투입 이력 현황"
            right={
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {rows.length}건
              </span>
            }
          />
          <div className="max-h-[68vh] overflow-auto" style={{ height: tableHeight }}>
            <DataGrid
              dataSource={rows}
              rowKey={(row, index) =>
                `${row.matCd ?? row.matNm ?? 'material'}-${row.reqYmd ?? 'date'}-${index}`
              }
              showBorders={true}
              loading={loading}
              emptyText="원자재 투입 이력 데이터가 없습니다."
              classNames={{
                table: 'min-w-[980px] w-full text-sm',
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

        <SearchCodePickers
          item={{
            open: itemPickerOpen,
            title: '원자재 정보',
            itemGb: 'RAW,SUB',
            itemNm: form.itemNm,
            onClose: () => setItemPickerOpen(false),
            onSelect: (value) => {
              setForm({
                itemCd: value.itemCd,
                itemNm: value.itemNm,
              });
            },
          }}
        />
      </div>
    </div>
  );
}
