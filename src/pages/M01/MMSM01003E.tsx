import { useEffect, useRef, useState } from 'react';
import DateEdit from '@/components/DateEdit';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import ItemCodePicker from '@/components/ItemCodePicker';
import CommonCodeSelectBox from '@/components/CommonCodeSelectBox';
import CodeNameField from '@/components/CodeNameField';
import { CheckColumn, Column, DataGrid } from '@/components/table/DataGrid';
import { normalizeString, toYmd } from '@/lib/excel';
import {
  exportExcelTemplate,
  parseExcelUploadFile,
  validateExcelUploadRows,
} from '@/lib/excelUpload';
import { patchCheckedRow, removeCheckedRows, toggleCheckedRow } from '@/lib/gridRows';
import { fetchCommonCodes, type CommonCodeItem } from '@/services/common/commonCode';
import {
  renderGridInputCell,
  renderGridReadOnlyCell,
  renderGridSelectCell,
  type GridCellOption,
} from '@/components/table/GridCells';
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
  status: string;
  description: string;
};

type DetailRow = {
  CHECK?: boolean;
  itemCd: string;
  itemNm: string;
  unitCd: string;
  qty: number | string;
  description: string;
  poSubSeq: number;
};

type SaveDetailRow = {
  poSubSeq: number | string;
  desc: string;
  itemCd: string;
  unitCd: string;
  qty: number | string;
};

type SaveMasterRow = {
  method: 'I' | 'D';
  userId: string;
  cstCd: string;
  poYmd: string;
  poSeq: string;
  desc: string;
};

type SavePayload = {
  masterData: SaveMasterRow[];
  detailData: SaveDetailRow[];
};

type AuthMeResponse = {
  user?: {
    userid?: string;
    userId?: string;
  };
  data?: {
    user?: {
      userid?: string;
      userId?: string;
    };
  };
};

type ExcelUploadRow = {
  itemCd: string;
  itemNm?: string;
  unitCd?: string;
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

const EXCEL_TEMPLATE_HEADERS = ['품목코드', '품목명', '수량', '비고'];

export default function MMSM01003E() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [customerOpen, setCustomerOpen] = useState(false);
  const [itemPickerOpen, setMaterialPickerOpen] = useState(false);
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setDetailRows(
      detailResult.content.map((row) => ({
        ...row,
        CHECK: false,
      }))
    );
  }, [detailResult.content]);

  function toggleMaster(rowIndex: number, checked: boolean) {
    setMasterRows((prev) => toggleCheckedRow(prev, rowIndex, checked));
  }

  function toggleDetail(rowIndex: number, checked: boolean) {
    setDetailRows((prev) => toggleCheckedRow(prev, rowIndex, checked));
  }

  function onDetailChange(rowIndex: number, patch: Partial<DetailRow>) {
    setDetailRows((prev) => patchCheckedRow(prev, rowIndex, patch));
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
        poSubSeq: prev.length + index + 1,
      }));

      return [...additions, ...prev];
    });
  }

  function onDeleteDetail() {
    setDetailRows((prev) => removeCheckedRows(prev));
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
    setDetailRows(
      rows.map((row, index) => ({
        CHECK: true,
        itemCd: row.itemCd ?? '',
        itemNm: row.itemNm ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.qty ?? '',
        description: row.desc ?? '',
        poSubSeq: index + 1,
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

      const detailData: SaveDetailRow[] = detailRows.map((row, index) => ({
        poSubSeq: row.poSubSeq ?? index + 1,
        desc: row.description ?? '',
        itemCd: row.itemCd ?? '',
        unitCd: row.unitCd ?? '',
        qty: row.qty ?? '',
      }));

      const masterData: SaveMasterRow[] = [
        {
          method: detailData.length === 0 ? 'D' : 'I',
          userId: userId,
          cstCd: form.cstCd || '',
          poYmd: toYmd(form.ivDate),
          poSeq: '',
          desc: '',
        },
      ];

      const payload: SavePayload = {
        masterData,
        detailData,
      };

      await http('/api/v1/material/pomst/savePayload', { method: 'POST', body: payload });
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
            {loading ? '조회중...' : '조회'}
          </button>
          <button
            onClick={() => onSave()}
            disabled={masterLoading || detailLoading || saving || uploading}
            className="h-8 px-3 border rounded"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={onUploadCsv}
            disabled={saving || uploading}
            className="h-8 px-3 border rounded"
          >
            {uploading ? '업로드 중...' : '엑셀 업로드'}
          </button>
          <button
            onClick={onExportCsv}
            className="h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
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
              dataField="poSubSeq"
              caption="발주상세순번"
              width={96}
              alignment="center"
              cellRender={(row) => renderGridReadOnlyCell(row.poSubSeq, { align: 'center' })}
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
