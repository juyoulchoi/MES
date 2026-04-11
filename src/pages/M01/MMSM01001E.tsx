import CodeNameField from '@/components/CodeNameField';
import ActionButtonGroup from '@/components/ActionButtonGroup';
import AlertBox from '@/components/AlertBox';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import DateEdit from '@/components/DateEdit';
import DateInput from '@/components/DateInput';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import { toYmd } from '@/lib/excel';
import {
  exportExcelTemplate,
  parseExcelUploadFile,
  validateExcelUploadRows,
} from '@/lib/excelUpload';
import { patchCheckedRow, removeCheckedRows, toggleCheckedRow } from '@/lib/gridRows';
import { http } from '@/lib/http';
import { EmptyPageResult, PAGE_SIZE } from '@/lib/pagination';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import {
  fetchMmsm01001Detail,
  type AuthMeResponse,
  type DetailRow,
  type ExcelUploadRow,
  type ExcelValidateResponse,
  type MasterRow,
  type SaveDetailRow,
  type SaveMasterRow,
  type SavePayload,
  type SearchForm,
} from '@/services/m01/mmsm01001';
import { useEffect, useRef, useState } from 'react';
import { useCodes } from '@/lib/hooks/useCodes';

const EXCEL_TEMPLATE_HEADERS = ['품목코드', '품목명', '수량', '비고'];

function getTodayYmd() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function MMSM01001E() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cstNm, setCstNm] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [deletedDetailRows, setDeletedDetailRows] = useState<DetailRow[]>([]);
  const [detailResult, setDetailResult] = useState(() => EmptyPageResult<DetailRow>(0, PAGE_SIZE));
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const minPoYmd = getTodayYmd();

  const [form, setForm] = useState<SearchForm>(() => ({
    poYmd: new Date().toISOString().slice(0, 10),
    cstCd: '',
    itemGb: '',
    poSeq: '',
  }));

  const { codes: emCodes } = useCodes('1100', []);

  const {
    result: masterResult,
    loading: masterLoading,
    error: masterError,
    fetchList: fetchMasterList,
  } = usePageApiFetch<SearchForm, MasterRow>({
    apiPath: '/api/v1/mdm/item/searchItemCustList',
    form,
    pageSize: PAGE_SIZE,
    mapParams: ({ form: currentForm }) => ({
      poYmd: currentForm.poYmd,
      itemGb: currentForm.itemGb || '',
      cstCd: currentForm.cstCd || '',
    }),
  });

  async function fetchDetailList(nextPage = 0) {
    setDetailLoading(true);
    setDetailError(null);

    try {
      setDetailResult(
        await fetchMmsm01001Detail({
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
    if (form.poYmd < minPoYmd) {
      window.alert('발주일자는 오늘 이전으로 선택할 수 없습니다.');
      return;
    }

    if (!form.cstCd) {
      window.alert('거래처 코드는 조회 필수값입니다.');
      return;
    }

    setDetailError(null);
    await Promise.all([fetchMasterList(0), fetchDetailList(0)]);
  }

  const isSearch = masterLoading || detailLoading || saving || uploading;
  const isSave = masterLoading || detailLoading || saving || uploading;
  const isUpload = saving || uploading;
  useEffect(() => {
    setMasterRows(masterResult.content.map((row) => ({ ...row, CHECK: false })));
  }, [masterResult.content]);

  useEffect(() => {
    setDeletedDetailRows([]);
    setDetailRows(
      detailResult.content.map((row) => ({
        ...row,
        reqYmd: row.reqYmd || form.poYmd,
        emGb: row.emGb || emCodes[0]?.code || '',
        CHECK: false,
      }))
    );
  }, [detailResult.content, emCodes]);

  function toggleMaster(rowIndex: number, checked: boolean) {
    setMasterRows((prev) => toggleCheckedRow(prev, rowIndex, checked));
  }

  function toggleDetail(rowIndex: number, checked: boolean) {
    setDetailRows((prev) => toggleCheckedRow(prev, rowIndex, checked));
  }

  function onDetailChange(rowIndex: number, patch: Partial<DetailRow>) {
    setDetailRows((prev) =>
      patchCheckedRow(prev, rowIndex, {
        ...patch,
        method: prev[rowIndex]?.method === 'I' ? 'I' : 'U',
      })
    );
  }

  function getNextPoSubSeq(rows: DetailRow[]) {
    return rows.reduce((max, row) => {
      const seq = Number(row.poSubSeq) || 0;
      return Math.max(max, seq);
    }, 0);
  }

  function onAddFromMaster() {
    const selected = masterRows.filter((row) => row.CHECK);
    if (selected.length === 0) return;

    setDetailRows((prev) => {
      const nextPoSubSeq = getNextPoSubSeq(prev);
      const additions = selected.map((row, index) => ({
        CHECK: true,
        method: 'I' as const,
        poSubSeq: nextPoSubSeq + index + 1,
        itemCd: row.itemCd ?? '',
        itemNm: row.itemNm ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.qty ?? '',
        reqYmd: form.poYmd,
        emGb: emCodes[0]?.code || '',
        itemTp: '',
        description: '',
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
          .filter((row) => row.method !== 'I' && row.poYmd && row.poSeq !== undefined)
          .map((row) => ({
            ...row,
            CHECK: false,
            method: 'D' as const,
          })),
      ]);

      return removeCheckedRows(prev);
    });
  }

  function onUploadCsv() {
    if (!form.poYmd) {
      setUploadError('발주일자를 먼저 선택하세요.');
      return;
    }

    if (!form.cstCd) {
      setUploadError('거래처를 먼저 선택하세요.');
      return;
    }

    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadWarnings([]);

    try {
      const rows = await parseExcelFile(file);
      const result = await validateExcelRows(rows);
      const validRows = result.validRows ?? [];
      const errors = result.errors ?? [];

      if (errors.length > 0) {
        setUploadWarnings(
          errors.map((row) => `${row.rowNo}행 ${row.field ?? ''} ${row.message}`.trim())
        );
      }

      if (validRows.length === 0) {
        setUploadError('업로드 가능한 데이터가 없습니다.');
        return;
      }

      applyUploadedRows(validRows);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }

  async function parseExcelFile(file: File): Promise<ExcelUploadRow[]> {
    return parseExcelUploadFile(file);
  }

  async function validateExcelRows(rows: ExcelUploadRow[]): Promise<ExcelValidateResponse> {
    return validateExcelUploadRows(rows);
  }

  function applyUploadedRows(rows: ExcelUploadRow[]) {
    setDeletedDetailRows([]);
    setDetailRows(
      rows.map((row, index) => ({
        CHECK: true,
        method: 'I' as const,
        poSubSeq: index + 1,
        itemCd: row.itemCd ?? '',
        itemNm: row.itemNm ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.qty ?? '',
        reqYmd: form.poYmd,
        emGb: emCodes[0]?.code || '',
        itemTp: '',
        description: row.desc ?? '',
      }))
    );
  }

  async function onSave() {
    if (detailRows.length === 0 && deletedDetailRows.length === 0) {
      setSaveError('저장할 데이터가 없습니다.');
      return;
    }

    if (form.poYmd < minPoYmd) {
      setSaveError('발주일자는 오늘 이전으로 선택할 수 없습니다.');
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

      const invalidRegYmdRowIndex = detailRows.findIndex(
        (row) => !row.reqYmd || row.reqYmd < form.poYmd
      );
      if (invalidRegYmdRowIndex >= 0) {
        setSaveError('상세 ' + (invalidRegYmdRowIndex + 1) + '행의 납기 요청일을 확인하세요.');
        return;
      }

      const invalidEmGbRowIndex = detailRows.findIndex((row) => !row.emGb);
      if (invalidEmGbRowIndex >= 0) {
        setSaveError('상세 ' + (invalidEmGbRowIndex + 1) + '행의 발주 구분을 선택하세요.');
        return;
      }

      const activeDetailData: SaveDetailRow[] = detailRows.map((row, index) => ({
        method: row.method ?? (row.poYmd && row.poSeq !== undefined ? 'U' : 'I'),
        poYmd: row.poYmd ?? '',
        poSeq: row.poSeq === undefined || row.poSeq === null ? '' : String(row.poSeq),
        poSubSeq: row.poSubSeq ?? index + 1,
        reqYmd: toYmd(row.reqYmd ?? ''),
        emGb: row.emGb ?? '',
        desc: row.description ?? '',
        itemCd: row.itemCd ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.qty ?? '',
      }));

      const deletedData: SaveDetailRow[] = deletedDetailRows.map((row, index) => ({
        method: 'D',
        poYmd: row.poYmd ?? '',
        poSeq: row.poSeq === undefined || row.poSeq === null ? '' : String(row.poSeq),
        poSubSeq: row.poSubSeq ?? index + 1,
        reqYmd: toYmd(row.reqYmd ?? ''),
        emGb: row.emGb ?? '',
        desc: row.description ?? '',
        itemCd: row.itemCd ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.qty ?? '',
      }));

      const detailData = [...activeDetailData, ...deletedData];
      const hasInsert = detailData.some((row) => row.method === 'I');
      const hasExistingChange = detailData.some((row) => row.method === 'U' || row.method === 'D');

      const masterData: SaveMasterRow[] = [
        {
          method: !hasInsert && hasExistingChange && detailRows.length === 0 ? 'D' : 'I',
          userId,
          cstCd: form.cstCd,
          poYmd: toYmd(form.poYmd),
          poSeq: '',
          desc: '',
        },
      ];

      const payload: SavePayload = {
        masterData,
        detailData,
      };

      await http('/api/v1/material/pomst/savePayload', { method: 'POST', body: payload });
      setDeletedDetailRows([]);
      await Promise.all([fetchMasterList(0), fetchDetailList(0)]);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function onExportCsv() {
    exportExcelTemplate(
      '원자재발주등록양식.xlsx',
      [
        {
          품목코드: 'RM001',
          품목명: '원자재명',
          수량: 100,
          비고: '비고',
        },
      ],
      EXCEL_TEMPLATE_HEADERS
    );
  }

  return (
    <div className="min-h-full bg-slate-50/60 p-4">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={onFileChange}
        />

        <SectionCard span="full" padding="md">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[450px_420px_1fr]">
            <DateEdit
              label="발주일자"
              value={form.poYmd}
              min={minPoYmd}
              onChange={(value) => {
                if (value < minPoYmd) {
                  window.alert('발주일자는 오늘 이전으로 선택할 수 없습니다.');
                  return;
                }

                setForm((prev) => ({ ...prev, poYmd: value }));
                setDetailRows((prev) =>
                  prev.map((row) => ({
                    ...row,
                    reqYmd: row.reqYmd && row.reqYmd >= value ? row.reqYmd : value,
                  }))
                );
              }}
            />
            <CodeNameField
              label="거래처코드"
              id="cust"
              code={form.cstCd}
              name={cstNm}
              codePlaceholder="코드"
              namePlaceholder="거래처 선택"
              onSearch={() => setCustomerOpen(true)}
            />
            <ActionButtonGroup
              onSearch={onSearch}
              onSave={() => onSave()}
              onUpload={onUploadCsv}
              onExport={onExportCsv}
              searchDisabled={isSearch}
              saveDisabled={isSave}
              uploadDisabled={isUpload}
            />
          </div>
        </SectionCard>

        {(masterError || detailError || saveError || uploadError) && (
          <AlertBox tone="error">{masterError ?? detailError ?? saveError ?? uploadError}</AlertBox>
        )}

        {uploadWarnings.length > 0 && (
          <AlertBox tone="warning">
            {uploadWarnings.map((warning, index) => (
              <div key={`${warning}-${index}`}>{warning}</div>
            ))}
          </AlertBox>
        )}

        <div className="grid grid-cols-12 gap-4">
          <SectionCard span="left" width="full">
            <SectionHeader
              title="발주 예비 품목"
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
                emptyText="발주 후보 데이터가 없습니다."
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleMaster(rowIndex, checked)}
                />
                <Column dataField="itemCd" caption="품목코드" width={80} alignment="center" />
                <Column dataField="itemNm" caption="품목명" width={120} alignment="left" />
                <Column dataField="unitCd" caption="단위  " width={60} alignment="center" />
              </DataGrid>
            </div>
          </SectionCard>

          <div className="col-span-12 flex items-center justify-center md:col-span-1">
            <div className="flex w-full flex-row gap-2 md:flex-col">
              <button
                onClick={onAddFromMaster}
                className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
              >
                추가
              </button>
              <button
                onClick={onDeleteDetail}
                className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
              >
                삭제
              </button>
            </div>
          </div>

          <SectionCard span="right" width="full">
            <SectionHeader title="발주 등록 상세" />
            <div className="max-h-[68vh] overflow-auto">
              <DataGrid
                dataSource={detailRows}
                showBorders={true}
                rowKey={(row, index) =>
                  `${row.poYmd ?? form.poYmd ?? 'new'}-${row.poSeq ?? 'new'}-${row.poSubSeq ?? 'detail'}-${row.itemCd ?? 'item'}-${index}`
                }
                emptyText="발주 상세 데이터가 없습니다. 좌측 후보에서 선택 후 추가하세요."
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleDetail(rowIndex, checked)}
                />
                <Column dataField="poSubSeq" caption="상세순번" width={88} alignment="center" />
                <Column dataField="itemCd" caption="원자재코드" width={120} alignment="center" />
                <Column dataField="itemNm" caption="원자재명" width={220} />
                <Column
                  dataField="reqYmd"
                  caption="납기 요청일"
                  width={140}
                  alignment="center"
                  cellRender={(row, rowIndex) => (
                    <DateInput
                      min={form.poYmd}
                      value={row.reqYmd || form.poYmd}
                      onChange={(value) => onDetailChange(rowIndex, { reqYmd: value })}
                    />
                  )}
                />
                <Column
                  dataField="emGb"
                  caption="발주 구분"
                  width={130}
                  alignment="center"
                  cellRender={(row, rowIndex) => (
                    <select
                      className="h-8 w-full rounded border border-slate-200 bg-white px-2 text-center"
                      value={row.emGb || ''}
                      onChange={(e) => onDetailChange(rowIndex, { emGb: e.target.value })}
                    >
                      {emCodes?.map((code) => (
                        <option key={code.code} value={code.code}>
                          {code.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
                <Column dataField="unitCd" caption="단위" width={90} alignment="center" />
                <Column
                  dataField="qty"
                  caption="발주수량"
                  width={120}
                  alignment="right"
                  cellRender={(row, rowIndex) => (
                    <input
                      className="h-8 w-full rounded border border-slate-200 px-2 text-right"
                      value={row.qty ?? ''}
                      onChange={(e) => onDetailChange(rowIndex, { qty: e.target.value })}
                    />
                  )}
                />
                <Column
                  dataField="description"
                  caption="비고"
                  width={280}
                  cellRender={(row, rowIndex) => (
                    <input
                      className="h-8 w-full rounded border border-slate-200 px-2"
                      value={row.description || ''}
                      onChange={(e) => onDetailChange(rowIndex, { description: e.target.value })}
                    />
                  )}
                />
              </DataGrid>
            </div>
          </SectionCard>
        </div>

        {customerOpen ? (
          <CustomerCodePicker
            title="거래처 정보"
            custGb="CUSTOMER"
            cstCd={form.cstCd}
            cstNm={cstNm}
            onClose={() => setCustomerOpen(false)}
            onSelect={(value) => {
              setCstNm(value.cstNm);
              setForm((prev) => ({ ...prev, cstCd: value.cstCd }));
            }}
          />
        ) : null}
      </div>
    </div>
  );
}




