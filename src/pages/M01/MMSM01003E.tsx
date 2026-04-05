import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import DateEdit from '@/components/DateEdit';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import ItemCodePicker from '@/components/ItemCodePicker';
import CommonCodeSelectBox from '@/components/CommonCodeSelectBox';
import CodeNameField from '@/components/CodeNameField';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import { renderGridInputCell, renderGridReadOnlyCell } from '@/components/table/GridCells';
import { http } from '@/lib/http';
import { PAGE_SIZE } from '@/lib/pagination';
import { usePageApiFetch } from '@/services/common/getApiFetch';

type SearchForm = {
  ivDate: string;
  cstCd: string;
  cstNm: string;
  itemCd: string;
  itemNm: string;
  itemGb: string;
};

type MasterRow = {
  CHECK?: boolean;
  itemCd: string;
  itemNm: string;
  unitCd: string;
  ivQty: number;
  description: string;
};

type DetailRow = {
  CHECK?: boolean;
  itemCd: string;
  itemNm: string;
  unitCd: string;
  qty: number | string;
  description: string;
  soSubSeq: number;
};

type SaveDetailRow = {
  SO_SUB_SEQ: number | string;
  DESC: string;
  ITEM_CD: string;
  UNIT_CD: string;
  QTY: number | string;
};

type SaveMasterRow = {
  METHOD: 'I' | 'D';
  USER_ID: string;
  CST_CD: string;
  SO_YMD: string;
  SO_SEQ: string;
  DESC: string;
};

type SavePayload = {
  masterData: SaveMasterRow[];
  detailData: SaveDetailRow[];
};

type AuthMeResponse = {
  user?: {
    userid?: string;
  };
};

type ExcelUploadRow = {
  itemCd: string;
  itemNm?: string;
  qty: number | string;
  desc?: string;
};

type ExcelValidateResponse = {
  validRows?: ExcelUploadRow[];
  errors?: Array<{
    rowNo: number;
    field?: string;
    message: string;
  }>;
};

type RawExcelRow = Record<string, string | number | null | undefined>;

const EXCEL_TEMPLATE_HEADERS = ['품목코드', '품목명', '수량', '비고'];

export default function MMSM01003E() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemPickerOpen, setMaterialPickerOpen] = useState(false);
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);

  const [form, setForm] = useState<SearchForm>(() => ({
    ivDate: new Date().toISOString().slice(0, 10),
    cstCd: '',
    cstNm: '',
    itemCd: '',
    itemNm: '',
    itemGb: '',
  }));

  function toYmd(value: string) {
    if (!value) return '';
    return value.replace(/-/g, '');
  }

  function normalizeString(value: unknown) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  function normalizeQty(value: unknown) {
    if (typeof value === 'number') return value;
    const text = normalizeString(value).replace(/,/g, '');
    if (!text) return '';
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : text;
  }

  function isBlankExcelRow(row: RawExcelRow) {
    return Object.values(row).every((value) => normalizeString(value) === '');
  }

  function downloadExcelFile(workbook: XLSX.WorkBook, filename: string) {
    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

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
      itemGb: currentForm.itemGb || '',
      itemCd: currentForm.itemCd || '',
      itemNm: currentForm.itemNm || '',
      cstCd: currentForm.cstCd || '',
    }),
  });

  const {
    result: detailResult,
    loading: detailLoading,
    error: detailError,
    fetchList: fetchDetailList,
  } = usePageApiFetch<SearchForm, DetailRow>({
    apiPath: '/api/v1/mdm/item/searchItemCustList',
    form,
    pageSize: PAGE_SIZE,
    mapParams: ({ form: currentForm }) => ({
      itemGb: currentForm.itemGb || '',
      itemCd: currentForm.itemCd || '',
      itemNm: currentForm.itemNm || '',
      cstCd: currentForm.cstCd || '',
    }),
  });

  useEffect(() => {
    setMasterRows(masterResult.content.map((row) => ({ ...row, CHECK: false })));
  }, [masterResult.content]);

  useEffect(() => {
    setDetailRows(detailResult.content.map((row) => ({ ...row, CHECK: false })));
  }, [detailResult.content]);

  function toggleMaster(rowIndex: number, checked: boolean) {
    setMasterRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], CHECK: checked };
      return next;
    });
  }

  function toggleDetail(rowIndex: number, checked: boolean) {
    setDetailRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], CHECK: checked };
      return next;
    });
  }

  function onDetailChange(rowIndex: number, patch: Partial<DetailRow>) {
    setDetailRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], ...patch, CHECK: true };
      return next;
    });
  }

  function onAddFromMaster() {
    const selected = masterRows.filter((row) => row.CHECK);
    if (selected.length === 0) return;

    setDetailRows((prev) => {
      const additions = selected.map((row, index) => ({
        CHECK: true,
        itemCd: row.itemCd ?? '',
        itemNm: row.itemNm ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.ivQty ?? '',
        description: row.description ?? '',
        soSubSeq: prev.length + index + 1,
      }));

      return [...additions, ...prev];
    });
  }

  function onDeleteDetail() {
    setDetailRows((prev) => prev.filter((row) => !row.CHECK));
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
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error('엑셀 시트를 찾을 수 없습니다.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<RawExcelRow>(sheet, {
      defval: '',
      raw: false,
    });

    const rows = rawRows.filter((row) => !isBlankExcelRow(row));

    if (rows.length === 0) {
      throw new Error('업로드할 데이터가 없습니다.');
    }

    return rows.map((row, index) => {
      const itemCd = normalizeString(row['품목코드']);
      const qty = normalizeQty(row['수량']);

      if (!itemCd) {
        throw new Error(`${index + 2}행 품목코드 값이 비어 있습니다.`);
      }

      if (qty === '') {
        throw new Error(`${index + 2}행 수량 값이 비어 있습니다.`);
      }

      if (typeof qty !== 'number') {
        throw new Error(`${index + 2}행 수량 값은 숫자여야 합니다.`);
      }

      return {
        itemCd,
        itemNm: normalizeString(row['품목명']),
        qty,
        desc: normalizeString(row['비고']),
      } satisfies ExcelUploadRow;
    });
  }

  async function validateExcelRows(rows: ExcelUploadRow[]): Promise<ExcelValidateResponse> {
    const validRows: ExcelUploadRow[] = [];
    const errors: NonNullable<ExcelValidateResponse['errors']> = [];

    rows.forEach((row, index) => {
      const rowNo = index + 2;
      const itemCd = normalizeString(row.itemCd);
      const qty = row.qty;
      let hasError = false;

      if (!itemCd) {
        errors.push({ rowNo, field: '품목코드', message: '품목코드는 필수입니다.' });
        hasError = true;
      }

      if (qty === '' || qty === null || qty === undefined) {
        errors.push({ rowNo, field: '수량', message: '수량은 필수입니다.' });
        hasError = true;
      }

      if (!hasError) {
        validRows.push({
          itemCd,
          itemNm: normalizeString(row.itemNm),
          qty,
          desc: normalizeString(row.desc),
        });
      }
    });

    return { validRows, errors };
  }

  function applyUploadedRows(rows: ExcelUploadRow[]) {
    setDetailRows(
      rows.map((row, index) => ({
        CHECK: true,
        itemCd: row.itemCd ?? '',
        itemNm: row.itemNm ?? '',
        unitCd: '',
        qty: row.qty ?? '',
        description: row.desc ?? '',
        soSubSeq: index + 1,
      }))
    );
  }

  async function onSave() {
    if (detailRows.length === 0) {
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
      const userId = me?.user?.userid ?? '';

      const detailData: SaveDetailRow[] = detailRows.map((row, index) => ({
        SO_SUB_SEQ: row.soSubSeq ?? index + 1,
        DESC: row.description ?? '',
        ITEM_CD: row.itemCd ?? '',
        UNIT_CD: row.unitCd ?? '',
        QTY: row.qty ?? '',
      }));

      const masterData: SaveMasterRow[] = [
        {
          METHOD: detailData.length === 0 ? 'D' : 'I',
          USER_ID: userId,
          CST_CD: form.cstCd || '',
          SO_YMD: toYmd(form.ivDate),
          SO_SEQ: '',
          DESC: '',
        },
      ];

      const payload: SavePayload = {
        masterData,
        detailData,
      };

      await http('/api/m01/mmsm01003/save', { method: 'POST', body: payload });
      await Promise.all([fetchMasterList(0), fetchDetailList(0)]);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function onExportCsv() {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(
      [
        {
          품목코드: 'RM001',
          품목명: '원자재명',
          수량: 100,
          비고: '비고',
        },
      ],
      {
        header: EXCEL_TEMPLATE_HEADERS,
      }
    );

    XLSX.utils.book_append_sheet(workbook, worksheet, 'upload');
    downloadExcelFile(workbook, '원자재입고등록양식.xlsx');
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">원자재 입고 등록</div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-2">
          <DateEdit label="입고일자" value={form.ivDate} />

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
        <div className="flex flex-wrap gap-2 justify-end xl:shrink-0">
          <button
            onClick={() => fetchMasterList(0)}
            disabled={masterLoading || detailLoading || saving || uploading}
            className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50"
          >
            조회
          </button>
          <button
            onClick={() => onSave()}
            disabled={masterLoading || detailLoading || saving || uploading}
            className="h-8 px-3 border rounded"
          >
            저장
          </button>
          <button
            onClick={onUploadCsv}
            disabled={saving || uploading}
            className="h-8 px-3 border rounded"
          >
            {uploading ? '업로드 중...' : '엑셀 업로드'}
          </button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">
            양식 다운로드
          </button>
        </div>
      </div>

      {(masterError || detailError || saveError || uploadError) && (
        <div className="text-sm text-destructive border border-destructive/30 rounded p-2">
          {masterError ?? detailError ?? saveError ?? uploadError}
        </div>
      )}

      {uploadWarnings.length > 0 && (
        <div className="text-sm border border-amber-300 bg-amber-50 rounded p-2 space-y-1">
          {uploadWarnings.map((warning, index) => (
            <div key={`${warning}-${index}`}>{warning}</div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 md:col-span-2">
          <DataGrid
            dataSource={masterRows}
            showBorders={true}
            rowKey={(row, index) => row.itemCd || index}
            emptyText="마스터 데이터가 없습니다. 조건 선택 후 조회하세요."
          >
            <CheckColumn
              checked={(row) => !!row.CHECK}
              onChange={(_row, rowIndex, checked) => toggleMaster(rowIndex, checked)}
            />
            <Column dataField="itemCd" caption="자재코드" width={112} alignment="center" />
            <Column dataField="itemNm" caption="자재명" />
          </DataGrid>
        </div>

        <div className="col-span-12 md:col-span-1 flex md:flex-col gap-2 items-center justify-center">
          <button onClick={onDeleteDetail} className="h-8 px-3 border rounded">
            삭제
          </button>
          <button onClick={onAddFromMaster} className="h-8 px-3 border rounded">
            추가
          </button>
        </div>

        <div className="col-span-12 md:col-span-9">
          <DataGrid
            dataSource={detailRows}
            showBorders={true}
            rowKey={(row, index) => `${row.itemCd || 'detail'}-${index}`}
            emptyText="디테일 데이터가 없습니다. 마스터에서 선택 후 추가하세요."
          >
            <CheckColumn
              checked={(row) => !!row.CHECK}
              onChange={(_row, rowIndex, checked) => toggleDetail(rowIndex, checked)}
            />
            <Column dataField="itemCd" caption="자재코드" width={120} alignment="center" />
            <Column dataField="itemNm" caption="자재명" width={200} />
            <Column dataField="unitCd" caption="단위" width={80} alignment="center" />
            <Column
              dataField="qty"
              caption="수량"
              dataType="number"
              width={96}
              cellRender={(row, rowIndex) =>
                renderGridInputCell({
                  value: row.qty,
                  align: 'right',
                  onChange: (e) => onDetailChange(rowIndex, { qty: e.target.value }),
                })
              }
            />
            <Column
              dataField="description"
              caption="비고"
              width={160}
              cellRender={(row, rowIndex) =>
                renderGridInputCell({
                  value: row.description,
                  onChange: (e) => onDetailChange(rowIndex, { description: e.target.value }),
                })
              }
            />
            <Column
              dataField="soSubSeq"
              caption="영업상세순번"
              width={96}
              alignment="center"
              cellRender={(row) => renderGridReadOnlyCell(row.soSubSeq, { align: 'center' })}
            />
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
          onClose={() => setMaterialPickerOpen(false)}
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
}
