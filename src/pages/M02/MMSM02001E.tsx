import CodeNameField from '@/components/CodeNameField';
import ActionButtonGroup from '@/components/ActionButtonGroup';
import AlertBox from '@/components/AlertBox';
import DateEdit from '@/components/DateEdit';
import DateInput from '@/components/DateInput';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import SearchCodePickers from '@/components/SearchCodePickers';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import { patchCheckedRow, removeCheckedRows } from '@/lib/gridRows';
import { http } from '@/lib/http';
import { EmptyPageResult, PAGE_SIZE } from '@/lib/pagination';
import { getTodayYmd, updateCheckedRows } from '@/pages/M01/registerDetailShared';
import { useCodes } from '@/lib/hooks/useCodes';
import {
  buildMmsm02001SavePayload,
  buildMmsm02001PlanPayload,
  fetchMmsm02001Detail,
  fetchMmsm02001Master,
  getNextDetailSubSeq,
  type AuthMeResponse,
  type DetailRow,
  type MasterRow,
  type SearchForm,
} from '@/services/m02/mmsm02001';
import { useEffect, useState } from 'react';

export default function MMSM02001E() {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cstNm, setCstNm] = useState('');
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [masterResult, setMasterResult] = useState(() => EmptyPageResult<MasterRow>(0, PAGE_SIZE));
  const [detailResult, setDetailResult] = useState(() => EmptyPageResult<DetailRow>(0, PAGE_SIZE));
  const [masterLoading, setMasterLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deletedDetailRows, setDeletedDetailRows] = useState<DetailRow[]>([]);

  const [form, setForm] = useState<SearchForm>(() => ({
    soYmd: getTodayYmd(),
    seq: '',
    cstCd: '',
  }));

  const { codes: emCodes } = useCodes('1100', []);
  const isSearch = masterLoading || detailLoading || saving;
  const isSave = masterLoading || detailLoading || saving;

  async function fetchMasterList(nextPage = 0) {
    setMasterLoading(true);
    setMasterError(null);

    try {
      setMasterResult(
        await fetchMmsm02001Master({
          form,
          page: nextPage,
          pageSize: PAGE_SIZE,
        })
      );
    } catch (e) {
      setMasterResult(EmptyPageResult<MasterRow>(nextPage, PAGE_SIZE));
      setMasterError(e instanceof Error ? e.message : String(e));
    } finally {
      setMasterLoading(false);
    }
  }

  async function fetchDetailList(nextPage = 0) {
    setDetailLoading(true);
    setDetailError(null);

    try {
      setDetailResult(
        await fetchMmsm02001Detail({
          form,
          page: nextPage,
          pageSize: PAGE_SIZE,
        })
      );
    } catch (e) {
      setDetailResult(EmptyPageResult<DetailRow>(nextPage, PAGE_SIZE));
      setDetailError(e instanceof Error ? e.message : String(e));
    } finally {
      setDetailLoading(false);
    }
  }

  async function onSearch() {
    if (!form.cstCd) {
      window.alert('거래처 코드는 조회 필수값입니다.');
      return;
    }

    setSaveError(null);
    await Promise.all([fetchMasterList(0), fetchDetailList(0)]);
  }

  useEffect(() => {
    setMasterRows(masterResult.content.map((row) => ({ ...row, CHECK: false })));
  }, [masterResult.content]);

  useEffect(() => {
    setDeletedDetailRows([]);
    setDetailRows(
      detailResult.content.map((row) => ({
        ...row,
        reqYmd: row.reqYmd || form.soYmd,
        emGb: row.emGb || emCodes[0]?.code || '',
        CHECK: false,
      }))
    );
  }, [detailResult.content, emCodes, form.soYmd]);

  function toggleMaster(rowIndex: number, checked: boolean) {
    updateCheckedRows(setMasterRows, rowIndex, checked);
  }

  function toggleDetail(rowIndex: number, checked: boolean) {
    updateCheckedRows(setDetailRows, rowIndex, checked);
  }

  function onDetailChange(rowIndex: number, patch: Partial<DetailRow>) {
    setDetailRows((prev) =>
      patchCheckedRow(prev, rowIndex, {
        ...patch,
        method: prev[rowIndex]?.method === 'I' ? 'I' : 'U',
      })
    );
  }

  function onAddFromMaster() {
    const selected = masterRows.filter((row) => row.CHECK);
    if (selected.length === 0) return;

    setDetailRows((prev) => {
      const nextSoSubSeq = getNextDetailSubSeq(prev);
      const additions = selected.map((row, index) => ({
        CHECK: true,
        method: 'I' as const,
        soSubSeq: nextSoSubSeq + index + 1,
        itemCd: row.itemCd ?? '',
        itemNm: row.itemNm ?? '',
        unitCd: row.unitCd ?? '',
        qty: '',
        price: '',
        reqYmd: form.soYmd,
        emGb: emCodes[0]?.code || '',
        description: '',
        endYn: '',
        salTp: '',
      }));

      return [...prev, ...additions];
    });
  }

  function onDeleteDetail() {
    setDetailRows((prev) => {
      const rowsToDelete = prev.filter((row) => row.CHECK);
      if (rowsToDelete.length === 0) {
        return prev;
      }

      setDeletedDetailRows((current) => [
        ...current,
        ...rowsToDelete
          .filter((row) => row.method !== 'I' && row.soYmd && row.soSeq !== undefined)
          .map((row) => ({
            ...row,
            CHECK: false,
            method: 'D' as const,
          })),
      ]);

      return removeCheckedRows(prev);
    });
  }

  async function onSave() {
    if (detailRows.length === 0 && deletedDetailRows.length === 0) {
      setSaveError('저장할 데이터가 없습니다.');
      return;
    }

    if (!form.cstCd) {
      setSaveError('거래처를 선택하세요.');
      return;
    }

    if (!window.confirm('저장 하시겠습니까?')) return;

    setSaving(true);
    setSaveError(null);

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
        setSaveError('사용자 정보를 확인할 수 없습니다. 다시 로그인 후 시도하세요.');
        return;
      }

      const invalidReqYmdRowIndex = detailRows.findIndex(
        (row) => !row.reqYmd || row.reqYmd < form.soYmd
      );
      if (invalidReqYmdRowIndex >= 0) {
        setSaveError('상세 ' + (invalidReqYmdRowIndex + 1) + '행의 납기 요청일을 확인하세요.');
        return;
      }

      const invalidEmGbRowIndex = detailRows.findIndex((row) => !row.emGb);
      if (invalidEmGbRowIndex >= 0) {
        setSaveError('상세 ' + (invalidEmGbRowIndex + 1) + '행의 긴급구분을 선택하세요.');
        return;
      }

      const payload = buildMmsm02001SavePayload({
        form,
        detailRows,
        deletedDetailRows,
        userId,
      });

      await http('/api/v1/sales/somst/savePayload', { method: 'POST', body: payload });
      setDeletedDetailRows([]);
      await Promise.all([fetchMasterList(0), fetchDetailList(0)]);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onCreatePlan() {
    if (!window.confirm('선택된 수주로 생산계획을 생성하시겠습니까?')) return;

    setSaving(true);
    setSaveError(null);

    try {
      await http('/api/m02/mmsm02001/plan', {
        method: 'POST',
        body: buildMmsm02001PlanPayload(form),
      });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function onExportCsv() {
    const headers = [
      '품목코드',
      '품목명',
      '납기요청일',
      '단위',
      '수량',
      '단가',
      '긴급구분',
    ];
    const lines = detailRows.map((row) =>
      [
        row.itemCd ?? '',
        row.itemNm ?? '',
        row.reqYmd ?? '',
        row.unitCd ?? '',
        row.qty ?? '',
        row.price ?? '',
        row.emGb ?? '',
      ]
        .map((value) => String(value ?? '').replace(/"/g, '""'))
        .map((value) => `"${value}"`)
        .join(',')
    );
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'MMSM02001E_detail.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-full bg-slate-50/60 p-4">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <SectionCard span="full" padding="md">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[450px_420px_1fr]">
            <DateEdit
              label="수주일자"
              value={form.soYmd}
              onChange={(value) => setForm((prev) => ({ ...prev, soYmd: value }))}
            />
            <CodeNameField
              label="거래처코드"
              id="cust"
              code={form.cstCd}
              name={cstNm}
              codePlaceholder="코드"
              namePlaceholder="거래처 선택"
              onSearch={() => setCustomerOpen(true)}
              onClear={() => {
                setCstNm('');
                setForm((prev) => ({ ...prev, cstCd: '' }));
              }}
            />
            <div className="flex flex-wrap items-end justify-end gap-2">
              <button
                onClick={() => void onCreatePlan()}
                disabled={isSave}
                className="h-10 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
              >
                생산계획생성
              </button>
              <ActionButtonGroup
                onSearch={() => void onSearch()}
                onSave={() => void onSave()}
                onUpload={() => undefined}
                onExport={onExportCsv}
                searchDisabled={isSearch}
                saveDisabled={isSave}
                showUpload={false}
                className="flex flex-wrap items-end justify-end gap-2"
              />
            </div>
          </div>
        </SectionCard>

        {(masterError || detailError || saveError) && (
          <AlertBox tone="error">{masterError ?? detailError ?? saveError}</AlertBox>
        )}

        <div className="grid grid-cols-12 gap-4">
          <SectionCard span="left" width="full">
            <SectionHeader
              title="수주 예비 품목"
              right={
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {masterRows.length}건
                </span>
              }
            />
            <div className="max-h-[68vh] overflow-auto">
              <DataGrid
                dataSource={masterRows}
                showBorders={true}
                rowKey={(row, index) => row.itemCd || index}
                emptyText="수주 후보 데이터가 없습니다."
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleMaster(rowIndex, checked)}
                />
                <Column dataField="itemCd" caption="품목코드" width={100} alignment="center" />
                <Column dataField="itemNm" caption="품목명" width={160} alignment="left" />
                <Column dataField="unitCd" caption="단위" width={80} alignment="center" />
              </DataGrid>
            </div>
          </SectionCard>

          <div className="col-span-12 flex items-center justify-center md:col-span-1">
            <div className="flex w-full flex-row gap-2 md:w-[60px] md:min-w-[60px] md:flex-col">
              <button
                onClick={onAddFromMaster}
                className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
              >
                추가
              </button>
              <button
                onClick={onDeleteDetail}
                className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-2 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
              >
                삭제
              </button>
            </div>
          </div>

          <SectionCard span="right" width="full">
            <SectionHeader title="수주 등록 상세" />
            <div className="max-h-[68vh] overflow-auto">
              <DataGrid
                dataSource={detailRows}
                showBorders={true}
                rowKey={(row, index) =>
                  `${form.soYmd}-${form.seq || 'new'}-${row.soSubSeq ?? 'detail'}-${row.itemCd ?? 'item'}-${index}`
                }
                emptyText="수주 상세 데이터가 없습니다. 좌측 후보에서 선택 후 추가하세요."
                classNames={{
                  table: 'min-w-[980px] w-full text-sm',
                }}
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleDetail(rowIndex, checked)}
                />
                <Column dataField="itemCd" caption="품목코드" width={120} alignment="center" />
                <Column dataField="itemNm" caption="품목명" width={220} />
                <Column
                  dataField="reqYmd"
                  caption="납기 요청일"
                  width={140}
                  alignment="center"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <DateInput
                      min={form.soYmd}
                      value={row.reqYmd || form.soYmd}
                      onChange={(value) => onDetailChange(rowIndex, { reqYmd: value })}
                    />
                  )}
                />
                <Column
                  dataField="emGb"
                  caption="긴급구분"
                  width={130}
                  alignment="center"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <select
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-center"
                      value={row.emGb || ''}
                      onChange={(event) => onDetailChange(rowIndex, { emGb: event.target.value })}
                    >
                      {emCodes.map((code) => (
                        <option key={code.code} value={code.code}>
                          {code.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                <Column
                  dataField="unitCd"
                  caption="단위"
                  width={90}
                  alignment="center"
                  cellRender={(row: DetailRow) => row.unitCd ?? ''}
                />
                <Column
                  dataField="qty"
                  caption="수주수량"
                  width={120}
                  alignment="right"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <input
                      className="h-8 w-full rounded border border-slate-200 px-2 text-right"
                      value={row.qty ?? ''}
                      onChange={(event) => onDetailChange(rowIndex, { qty: event.target.value })}
                    />
                  )}
                />
                <Column
                  dataField="price"
                  caption="단가"
                  width={120}
                  alignment="right"
                  headerAlignment="center"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <input
                      className="h-8 w-full rounded border border-slate-200 px-2 text-right"
                      value={row.price ?? ''}
                      onChange={(event) => onDetailChange(rowIndex, { price: event.target.value })}
                    />
                  )}
                />
              </DataGrid>
            </div>
          </SectionCard>
        </div>

        <SearchCodePickers
          customer={{
            open: customerOpen,
            title: '거래처 정보',
            custGb: 'CUSTOMER',
            cstCd: form.cstCd,
            cstNm,
            onClose: () => setCustomerOpen(false),
            onSelect: (value) => {
              setCstNm(value.cstNm);
              setForm((prev) => ({ ...prev, cstCd: value.cstCd }));
            },
          }}
        />
      </div>
    </div>
  );
}
