import React, { useEffect, useMemo, useRef, useState } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import ExportCsvButton from '@/components/ExportCsvButton';
import ItemCodePicker from '@/components/ItemCodePicker';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { CheckColumn, Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { http } from '@/lib/http';
import { PAGE_SIZE } from '@/lib/pagination';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import { updateCheckedRows } from '@/pages/M01/registerDetailShared';
import {
  buildStockAdjustPayload,
  calculateAdjustQty,
  exportHeaders,
  mapExportRow,
  readOnlyColumns,
  type RowItem,
  type SearchForm,
} from '@/services/m01/mmsm01008';

function getTodayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export default function MMSM01008E() {
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  const [form, setForm] = useState<SearchForm>({
    adjustDate: getTodayYmd(),
    itemCd: '',
    itemNm: '',
  });

  const { result, loading, error, fetchList } = usePageApiFetch<SearchForm, RowItem>({
    apiPath: '/api/v1/mdm/stkmst/searchStkMstDetList',
    form,
    pageSize: PAGE_SIZE,
    includeSizeParam: false,
    mapParams: ({ form: currentForm }) => ({
      giYmdS: currentForm.adjustDate.split('-').join(''),
      giYmdE: currentForm.adjustDate.split('-').join(''),
      itemCd: currentForm.itemCd || '',
      cstCd: '',
    }),
  });

  useEffect(() => {
    setRows(
      result.content.map((row) => ({
        ...row,
        CHECK: false,
        realQty: row.realQty ?? '',
        adjustQty: row.adjustQty ?? '',
        description: row.description ?? '',
      }))
    );
  }, [result.content]);

  const displayResult = useMemo(
    () => ({
      ...result,
      content: rows,
    }),
    [result, rows]
  );

  const busy = loading || saving;

  function toggleRow(rowIndex: number, checked: boolean) {
    updateCheckedRows(setRows, rowIndex, checked);
  }

  function updateRow(rowIndex: number, patch: Partial<RowItem>) {
    setRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) return row;

        const next = { ...row, ...patch, CHECK: true };
        if (Object.prototype.hasOwnProperty.call(patch, 'realQty')) {
          next.adjustQty = calculateAdjustQty(row.qty, patch.realQty);
        }
        return next;
      })
    );
  }

  async function onSave() {
    const targets = rows.filter((row) => row.CHECK);

    if (targets.length === 0) {
      window.alert('저장할 재고 조정 데이터가 없습니다.');
      return;
    }

    const invalidRowIndex = targets.findIndex((row) => row.realQty === undefined || row.realQty === '');
    if (invalidRowIndex >= 0) {
      window.alert('실사량을 입력하세요.');
      return;
    }

    if (!window.confirm(`선택한 ${targets.length}건의 재고를 조정하시겠습니까?`)) return;

    setSaving(true);
    try {
      await http('/api/v1/mdm/stkmst/adjust', {
        method: 'POST',
        body: buildStockAdjustPayload(targets, form.adjustDate),
      });
      await fetchList(result.page);
      window.alert('저장되었습니다.');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50/60 p-4" ref={containerRef}>
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <SectionCard span="full" padding="md">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_546px_1fr] xl:gap-12">
            <label className="flex flex-col text-sm font-medium text-slate-700">
              <span className="mb-1">조정일자</span>
              <input
                type="date"
                value={form.adjustDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, adjustDate: event.target.value }))
                }
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400"
              />
            </label>

            <CodeNameField
              label="원자재명"
              id="item"
              code={form.itemCd}
              name={form.itemNm}
              codePlaceholder="코드"
              namePlaceholder="원자재 선택"
              onSearch={() => setItemPickerOpen(true)}
              onClear={() => setForm((prev) => ({ ...prev, itemCd: '', itemNm: '' }))}
            />

            <div className="flex flex-wrap items-end justify-end gap-2">
              <button
                onClick={() => void fetchList(0)}
                className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                disabled={busy}
              >
                {loading ? '조회중...' : '조회'}
              </button>
              <button
                onClick={() => void onSave()}
                className="h-10 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                disabled={busy}
              >
                {saving ? '저장중...' : '저장'}
              </button>
              <ExportCsvButton
                rows={rows}
                headers={exportHeaders}
                mapRow={mapExportRow}
                filename={() => `원자재재고조정_${form.adjustDate.split('-').join('')}.csv`}
                variant="outline"
                className="h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 shadow-none transition hover:bg-emerald-100"
              />
            </div>
          </div>
        </SectionCard>

        {error && <AlertBox tone="error">{error}</AlertBox>}

        <SectionCard span="full" width="full">
          <SectionHeader
            title="원자재 재고조정"
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
              rowKey={(row, index) => `${row.itemCd ?? 'item'}-${row.ymd ?? 'ymd'}-${index}`}
              showBorders={true}
              loading={busy}
              remoteOperations={true}
              emptyText="재고 조정 대상 데이터가 없습니다."
              onPageChange={(page) => void fetchList(page)}
              classNames={{
                table: 'min-w-[1420px] w-full text-sm',
              }}
            >
              <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
              <Pager visible={true} showPageSizeSelector={false} />
              <CheckColumn
                checked={(row) => !!row.CHECK}
                onChange={(_row, rowIndex, checked) => toggleRow(rowIndex, checked)}
              />
              {readOnlyColumns.map((column, index) => (
                <Column
                  key={`${String(column.dataField)}-${index}`}
                  dataField={column.dataField}
                  caption={column.caption}
                  width={column.width}
                  alignment={column.alignment}
                  cellRender={column.cellRender}
                />
              ))}
              <Column
                dataField="realQty"
                caption="실사량"
                width={120}
                alignment="right"
                cellRender={(row, rowIndex) => (
                  <input
                    value={row.realQty ?? ''}
                    onChange={(event) => updateRow(rowIndex, { realQty: event.target.value })}
                    className="h-8 w-full rounded-md border border-slate-200 px-2 text-right text-sm outline-none focus:border-slate-400"
                  />
                )}
              />
              <Column
                dataField="adjustQty"
                caption="조정량"
                width={120}
                alignment="right"
                cellRender={(row, rowIndex) => (
                  <input
                    value={row.adjustQty ?? ''}
                    onChange={(event) => updateRow(rowIndex, { adjustQty: event.target.value })}
                    className="h-8 w-full rounded-md border border-slate-200 px-2 text-right text-sm outline-none focus:border-slate-400"
                  />
                )}
              />
              <Column
                dataField="description"
                caption="조정사유"
                width={280}
                cellRender={(row, rowIndex) => (
                  <input
                    value={row.description ?? ''}
                    onChange={(event) => updateRow(rowIndex, { description: event.target.value })}
                    className="h-8 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-slate-400"
                  />
                )}
              />
            </DataGrid>
          </div>
        </SectionCard>

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
}
