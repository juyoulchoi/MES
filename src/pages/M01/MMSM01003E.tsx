import CodeNameField from '@/components/CodeNameField';
import ActionButtonGroup from '@/components/ActionButtonGroup';
import AlertBox from '@/components/AlertBox';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import DateEdit from '@/components/DateEdit';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import {
  exportExcelTemplate,
  parseExcelUploadFile,
  validateExcelUploadRows,
} from '@/lib/excelUpload';
import { patchCheckedRow, removeCheckedRows } from '@/lib/gridRows';
import { http } from '@/lib/http';
import { formatNumber } from '@/lib/utils';
import { EmptyPageResult, PAGE_SIZE } from '@/lib/pagination';
import {
  calculateAmount,
  getTodayYmd,
  updateCheckedRows,
} from '@/pages/M01/registerDetailShared';
import { usePageApiFetch } from '@/services/common/getApiFetch';
import {
  buildMmsm01003SavePayload,
  createUploadedDetailRows,
  dedupeDetailRows,
  fetchMmsm01003Detail,
  getDetailRowKey,
  getNextDetailSubSeq,
  normalizeDetailRow,
  type AuthMeResponse,
  type DetailRow,
  type ExcelUploadRow,
  type ExcelValidateResponse,
  type SearchForm,
} from '@/services/m01/mmsm01003';
import { useEffect, useRef, useState } from 'react';

type MasterRow = {
  CHECK?: boolean;
  poYmd?: string;
  poSeq?: number | string;
  poSubSeq?: number | string;
  itemCd?: string;
  itemNm?: string;
  unitCd?: string;
  qty?: number | string;
  price?: number | string;
  amt?: number | string;
};

const EXCEL_TEMPLATE_HEADERS = ['품목코드', '품목명', '수량', '비고'];

export default function MMSM01003E() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const detailGridRef = useRef<HTMLDivElement | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cstNm, setCstNm] = useState('');
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [deletedDetailRows, setDeletedDetailRows] = useState<DetailRow[]>([]);
  const [detailResult, setDetailResult] = useState(() => EmptyPageResult<DetailRow>(0, PAGE_SIZE));
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);
  const [itemNameWidth, setItemNameWidth] = useState(220);
  const [descriptionWidth, setDescriptionWidth] = useState(280);

  const [form, setForm] = useState<SearchForm>(() => ({
    ivDate: getTodayYmd(),
    cstCd: '',
  }));

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
      itemGb: '',
      cstCd: currentForm.cstCd || '',
    }),
  });

  async function fetchDetailList(nextPage = 0) {
    setDetailLoading(true);
    setDetailError(null);

    try {
      setDetailResult(
        await fetchMmsm01003Detail({
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
        ...normalizeDetailRow(row),
        CHECK: false,
      }))
    );
  }, [detailResult.content]);

  useEffect(() => {
    const element = detailGridRef.current;
    if (!element) return;

    const updateWidths = () => {
      const nextWidth = element.clientWidth;
      if (!nextWidth) return;

      const fixedWidth = 48 + 88 + 88 + 120 + 90 + 120 + 120 + 130 + 40;
      const remaining = Math.max(nextWidth - fixedWidth, 360);
      const nextItemNameWidth = Math.min(Math.max(Math.floor(remaining * 0.4), 180), 320);
      const nextDescriptionWidth = Math.max(remaining - nextItemNameWidth, 180);

      setItemNameWidth(nextItemNameWidth);
      setDescriptionWidth(nextDescriptionWidth);
    };

    updateWidths();
    const observer = new ResizeObserver(updateWidths);
    observer.observe(element);
    window.addEventListener('resize', updateWidths);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidths);
    };
  }, []);

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
      const nextDetailSubSeq = getNextDetailSubSeq(prev);
      const additions = selected.map((row, index) => ({
        CHECK: true,
        method: 'I' as const,
        ivSubSeq: nextDetailSubSeq + index + 1,
        poYmd: row.poYmd ?? '',
        poSeq: row.poSeq ?? '',
        poSubSeq: row.poSubSeq ?? '',
        itemCd: row.itemCd ?? '',
        itemNm: row.itemNm ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.qty ?? '',
        price: row.price ?? '',
        amt: row.amt ?? '',
        description: '',
      }));

      return [...prev, ...additions];
    });

    setMasterRows((prev) => prev.map((row) => ({ ...row, CHECK: false })));
  }

  function onDeleteDetail() {
    setDetailRows((prev) => {
      const rowsToDelete = prev.filter((row) => row.CHECK);
      if (rowsToDelete.length === 0) {
        return prev;
      }

      setDeletedDetailRows((current) =>
        dedupeDetailRows([
          ...current,
          ...rowsToDelete
            .map((row) => normalizeDetailRow(row))
            .filter((row) => row.method !== 'I' && row.ivYmd && row.ivSeq !== undefined)
            .map((row) => ({
              ...row,
              CHECK: false,
              method: 'D' as const,
            })),
        ])
      );

      return removeCheckedRows(prev);
    });
  }

  function onUploadCsv() {
    if (!form.ivDate) {
      setUploadError('입고일자를 먼저 선택하세요.');
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
          errors.map((error) => `${error.rowNo}행 ${error.field ?? ''} ${error.message}`.trim())
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
    setDetailRows(createUploadedDetailRows(rows));
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

      const payload = buildMmsm01003SavePayload({
        form,
        detailRows,
        deletedDetailRows,
        userId,
      });

      await http('/api/v1/material/ivmst/savePayload', { method: 'POST', body: payload });
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
      '원자재입고등록양식.xlsx',
      [
        {
          품목코드: 'RM001',
          품목명: '원자재명',
          단위: 'EA',
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
              label="입고일자"
              value={form.ivDate}
              onChange={(value) => setForm((prev) => ({ ...prev, ivDate: value }))}
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
            <SectionHeader title="입고 등록 상세" />
            <div ref={detailGridRef} className="max-h-[68vh] overflow-auto">
              <DataGrid
                dataSource={detailRows}
                showBorders={true}
                rowKey={(row, index) => {
                  const key = getDetailRowKey(row);
                  return key === '||' ? `${row.itemCd ?? 'item'}-${index}` : `${key}-${index}`;
                }}
                emptyText="입고 상세 데이터가 없습니다. 좌측 후보에서 선택 후 추가하세요."
                classNames={{
                  table: 'min-w-[1200px] w-full text-sm',
                }}
              >
                <CheckColumn
                  checked={(row) => !!row.CHECK}
                  onChange={(_row, rowIndex, checked) => toggleDetail(rowIndex, checked)}
                />
                <Column dataField="ivSeq" caption="입고순번" width={88} alignment="center" />
                <Column dataField="ivSubSeq" caption="상세순번" width={88} alignment="center" />
                <Column dataField="itemCd" caption="원자재코드" width={120} alignment="center" />
                <Column dataField="itemNm" caption="원자재명" width={itemNameWidth} />
                <Column dataField="unitCd" caption="단위" width={90} alignment="center" />
                <Column
                  dataField="qty"
                  caption="입고수량"
                  width={120}
                  alignment="right"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <input
                      className="h-8 w-full rounded border border-slate-200 px-2 text-right"
                      value={row.qty ?? ''}
                      onChange={(e) => onDetailChange(rowIndex, { qty: e.target.value })}
                    />
                  )}
                />
                <Column
                  dataField="price"
                  caption="단가"
                  width={120}
                  alignment="right"
                  cellRender={(row: DetailRow, rowIndex) => (
                    <input
                      className="h-8 w-full rounded border border-slate-200 px-2 text-right"
                      value={row.price ?? ''}
                      onChange={(e) => onDetailChange(rowIndex, { price: e.target.value })}
                    />
                  )}
                />
                <Column
                  dataField="amt"
                  caption="금액"
                  width={130}
                  alignment="right"
                  cellRender={(row: DetailRow) => (
                    <div className="px-2 text-right">
                      {formatNumber(calculateAmount(row.qty, row.price))}
                    </div>
                  )}
                />
                <Column
                  dataField="description"
                  caption="비고"
                  width={descriptionWidth}
                  cellRender={(row: DetailRow, rowIndex) => (
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
