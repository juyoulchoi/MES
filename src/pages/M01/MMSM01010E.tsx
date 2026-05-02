import { useRef, useState, type ReactNode } from 'react';

import AlertBox from '@/components/AlertBox';
import CodeNameField from '@/components/CodeNameField';
import CustomerCodePicker from '@/components/CustomerCodePicker';
import ExportCsvButton from '@/components/ExportCsvButton';
import SectionCard from '@/components/SectionCard';
import SectionHeader from '@/components/SectionHeader';
import { Column, DataGrid, Pager, Paging } from '@/components/table/DataGrid';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';
import { http } from '@/lib/http';
import { PAGE_SIZE, type PageableResponse } from '@/lib/pagination';
import {
  exportHeaders,
  formatRegNo,
  formatStatus,
  getContent,
  mapExportRow,
  normalizeCustomerRow,
  normalizeMasterRow,
  onlyDigits,
  patchCustomerRow,
  toCustInfoPayload,
  type CustomerApiRow,
  type DetailRow,
  type MasterRow,
} from '@/services/m01/mmsm01010';

function DetailInput({
  label,
  value,
  readOnly = false,
  maxLength,
  onChange,
}: {
  label: string;
  value?: string;
  readOnly?: boolean;
  maxLength?: number;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[120px_1fr] items-center gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <input
        value={value ?? ''}
        readOnly={readOnly}
        maxLength={maxLength}
        onChange={(event) => onChange?.(event.target.value)}
        className={`h-9 rounded-md border px-3 text-sm outline-none transition ${
          readOnly
            ? 'border-slate-100 bg-slate-50 text-slate-500'
            : 'border-slate-200 bg-white text-slate-800 focus:border-slate-400'
        }`}
      />
    </label>
  );
}

function DetailTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <span className="pt-2 text-slate-500">{label}</span>
      <textarea
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[76px] resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
      />
    </label>
  );
}

function DetailSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[120px_1fr] items-center gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <select
        value={value || 'ACTIVE'}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-slate-400"
      >
        <option value="ACTIVE">활성</option>
        <option value="INACTIVE">비활성화</option>
      </select>
    </label>
  );
}

function ClickableCell({
  children,
  onDoubleClick,
  align = 'left',
}: {
  children: ReactNode;
  onDoubleClick: () => void;
  align?: 'left' | 'center';
}) {
  return (
    <button
      type="button"
      onDoubleClick={onDoubleClick}
      className={`w-full rounded px-1 py-0.5 text-sm text-slate-800 transition hover:bg-slate-100 ${
        align === 'center' ? 'text-center' : 'text-left'
      }`}
      title="더블 클릭하여 상세 보기"
    >
      {children}
    </button>
  );
}

export default function MMSM01010E() {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [detail, setDetail] = useState<DetailRow[]>([]);
  const [detailPopupRow, setDetailPopupRow] = useState<DetailRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableHeight = useAutoTableHeight(containerRef);

  const busy = loading || saving;
  const gridHeight = Math.max(tableHeight - 58, 360);

  async function loadMaster() {
    const qs = new URLSearchParams({
      custGb: 'CUSTOMER',
      cstNm: cstNm || '',
      page: '0',
      size: '200',
    }).toString();
    const data = await http<PageableResponse<CustomerApiRow>>(`/api/v1/mdm/cust/search?${qs}`);
    return getContent(data).map((row) => normalizeMasterRow(row));
  }

  async function loadDetail() {
    if (!cstCd) return [];

    const data = await http<CustomerApiRow>(`/api/v1/mdm/cust/${encodeURIComponent(cstCd)}`);
    return getContent<CustomerApiRow>(data).map((row) => ({
      ...normalizeCustomerRow(row),
      isNew: false,
    }));
  }

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      const [masterRows, detailRows] = await Promise.all([loadMaster(), loadDetail()]);
      setMaster(masterRows);
      setDetail(detailRows);
    } catch (e) {
      setMaster([]);
      setDetail([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onDetailChange(rowIndex: number, patch: Partial<DetailRow>) {
    setDetail((prev) =>
      prev.map((row, index) => (index === rowIndex ? { ...row, ...patch } : row))
    );
  }

  function openCustomerDetail(row: MasterRow | DetailRow) {
    setDetailPopupRow(normalizeCustomerRow(row));
  }

  function updateDetailPopup(patch: Partial<DetailRow>) {
    setDetailPopupRow((prev) => (prev ? patchCustomerRow(prev, patch) : prev));
  }

  function openRegisterPopup() {
    setError(null);
    setDetailPopupRow({
      isRegister: true,
      cstCd: '',
      cstNm: '',
      custGb: 'CUSTOMER',
      ceoNm: '',
      mgrNm: '',
      telNo: '',
      mgrTel: '',
      email: '',
      faxNo: '',
      regNo: '',
      postNo: '',
      addr: '',
      status: 'ACTIVE',
    });
  }

  async function onSaveCustomerDetail() {
    if (!detailPopupRow) {
      setError('저장할 거래처 정보가 없습니다.');
      return;
    }

    if (!detailPopupRow.isRegister && !detailPopupRow.cstCd) {
      setError('거래처 코드가 없는 상세 정보는 저장할 수 없습니다.');
      return;
    }

    if (!detailPopupRow.cstNm) {
      setError('거래처명은 필수입니다.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await http('/api/v1/mdm/cust', {
        method: 'POST',
        body: toCustInfoPayload(detailPopupRow),
      });

      if (detailPopupRow.isRegister) {
        await onSearch();
        window.alert('거래처가 등록되었습니다.');
        setDetailPopupRow(null);
        return;
      }

      setMaster((prev) =>
        prev.map((row) =>
          row.cstCd === detailPopupRow.cstCd
            ? patchCustomerRow(row, detailPopupRow)
            : row
        )
      );
      setDetail((prev) =>
        prev.map((row) =>
          row.cstCd === detailPopupRow.cstCd
            ? patchCustomerRow(row, detailPopupRow)
            : row
        )
      );
      if (cstCd === detailPopupRow.cstCd) {
        setCstNm(detailPopupRow.cstNm ?? '');
      }

      window.alert('거래처 상세 정보가 저장되었습니다.');
      setDetailPopupRow(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50/60 p-4" ref={containerRef}>
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <SectionCard span="full" padding="md">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[546px_1fr] xl:gap-12">
            <CodeNameField
              label="거래처명"
              id="cust"
              code={cstCd}
              name={cstNm}
              codePlaceholder="코드"
              namePlaceholder="거래처 선택"
              onSearch={() => setCustomerOpen(true)}
              onClear={() => {
                setCstCd('');
                setCstNm('');
              }}
            />

            <div className="flex flex-wrap items-end justify-end gap-2">
              <button
                onClick={() => void onSearch()}
                disabled={busy}
                className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? '조회중...' : '조회'}
              </button>
              <button
                onClick={openRegisterPopup}
                disabled={busy}
                className="h-10 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
              >
                등록
              </button>
              <ExportCsvButton
                rows={detail}
                headers={exportHeaders}
                mapRow={mapExportRow}
                filename={() => `원자재거래처관리_${cstCd || '전체'}.csv`}
                variant="outline"
                className="h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 shadow-none transition hover:bg-emerald-100"
              />
            </div>
          </div>

        </SectionCard>

        {error ? <AlertBox tone="error">{error}</AlertBox> : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard span="full" width="full">
            <SectionHeader
              title="거래처 목록"
              right={
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {master.length}건
                </span>
              }
            />
            <div className="max-h-[68vh] overflow-auto" style={{ height: gridHeight }}>
              <DataGrid
                dataSource={master}
                rowKey={(row, index) => `${row.cstCd ?? row.itemCd ?? 'master'}-${index}`}
                showBorders={true}
                loading={busy}
                emptyText="추가 가능한 거래처 데이터가 없습니다."
                classNames={{ table: 'min-w-[1120px] w-full text-sm' }}
              >
                <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
                <Pager visible={true} showPageSizeSelector={false} />
                <Column<MasterRow>
                  dataField="cstCd"
                  caption="거래처코드"
                  width={140}
                  alignment="center"
                  cellRender={(row) => (
                    <ClickableCell onDoubleClick={() => openCustomerDetail(row)} align="center">
                      {row.cstCd ?? ''}
                    </ClickableCell>
                  )}
                />
                <Column<MasterRow>
                  dataField="cstNm"
                  caption="거래처명"
                  width={220}
                  cellRender={(row) => (
                    <ClickableCell onDoubleClick={() => openCustomerDetail(row)}>
                      {row.cstNm ?? ''}
                    </ClickableCell>
                  )}
                />
                <Column<MasterRow>
                  dataField="custGb"
                  caption="구분"
                  width={100}
                  alignment="center"
                />
                <Column<MasterRow> dataField="ceoNm" caption="대표자명" width={120} />
                <Column<MasterRow> dataField="mgrNm" caption="담당자" width={120} />
                <Column<MasterRow> dataField="telNo" caption="전화번호" width={140} />
                <Column<MasterRow>
                  dataField="status"
                  caption="상태"
                  width={100}
                  alignment="center"
                  cellRender={(row) => formatStatus(row.status)}
                />
              </DataGrid>
            </div>
          </SectionCard>

          <SectionCard span="full" width="full">
            <SectionHeader
              title="거래처 관리"
              right={
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {detail.length}건
                </span>
              }
            />
            <div className="max-h-[68vh] overflow-auto" style={{ height: gridHeight }}>
              <DataGrid
                dataSource={detail}
                rowKey={(row, index) => `${row.cstCd ?? row.itemCd ?? 'detail'}-${row.isNew ? 'new' : 'old'}-${index}`}
                showBorders={true}
                loading={busy}
                emptyText="거래처 관리 데이터가 없습니다. 거래처 목록에서 거래처를 선택하세요."
                classNames={{ table: 'min-w-[1260px] w-full text-sm' }}
              >
                <Paging enabled={true} defaultPageSize={PAGE_SIZE} />
                <Pager visible={true} showPageSizeSelector={false} />
                <Column<DetailRow>
                  dataField="isNew"
                  caption="신규"
                  width={70}
                  alignment="center"
                  cellRender={(row) =>
                    row.isNew ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                        신규
                      </span>
                    ) : (
                      ''
                    )
                  }
                />
                <Column<DetailRow>
                  dataField="cstCd"
                  caption="거래처코드"
                  width={140}
                  alignment="center"
                  cellRender={(row) => (
                    <ClickableCell onDoubleClick={() => openCustomerDetail(row)} align="center">
                      {row.cstCd ?? ''}
                    </ClickableCell>
                  )}
                />
                <Column<DetailRow>
                  dataField="cstNm"
                  caption="거래처명"
                  width={220}
                  cellRender={(row) => (
                    <ClickableCell onDoubleClick={() => openCustomerDetail(row)}>
                      {row.cstNm ?? ''}
                    </ClickableCell>
                  )}
                />
                <Column<DetailRow>
                  dataField="custGb"
                  caption="구분"
                  width={100}
                  alignment="center"
                />
                <Column<DetailRow> dataField="ceoNm" caption="대표자명" width={120} />
                <Column<DetailRow> dataField="mgrNm" caption="담당자" width={120} />
                <Column<DetailRow> dataField="telNo" caption="전화번호" width={140} />
                <Column<DetailRow>
                  dataField="status"
                  caption="상태"
                  width={100}
                  alignment="center"
                  cellRender={(row) => formatStatus(row.status)}
                />
                <Column<DetailRow>
                  dataField="mainYn"
                  caption="대표여부"
                  width={120}
                  alignment="center"
                  cellRender={(row, rowIndex) => (
                    <select
                      value={row.mainYn ?? ''}
                      onChange={(event) =>
                        onDetailChange(rowIndex, { mainYn: event.target.value as 'Y' | 'N' | '' })
                      }
                      className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-slate-400"
                    >
                      <option value=""></option>
                      <option value="Y">Y</option>
                      <option value="N">N</option>
                    </select>
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
            cstCd={cstCd}
            cstNm={cstNm}
            onClose={() => setCustomerOpen(false)}
            onSelect={(value) => {
              setCstCd(value.cstCd);
              setCstNm(value.cstNm);
            }}
          />
        ) : null}

        {detailPopupRow ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="flex max-h-[88vh] w-full max-w-[930px] flex-col rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {detailPopupRow.isRegister ? '거래처 등록' : '거래처 상세'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {detailPopupRow.isRegister
                      ? '거래처 코드는 저장 시 자동 생성됩니다.'
                      : `${detailPopupRow.cstCd} · ${detailPopupRow.cstNm}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void onSaveCustomerDetail()}
                    disabled={saving}
                    className="h-9 rounded-lg border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 transition hover:bg-sky-100 disabled:opacity-50"
                  >
                    {saving ? '저장중...' : detailPopupRow.isRegister ? '등록' : '저장'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailPopupRow(null)}
                    className="h-9 rounded-lg border border-slate-200 px-4 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    닫기
                  </button>
                </div>
              </div>

              <div className="grid gap-x-8 gap-y-4 overflow-auto p-6 md:grid-cols-2">
                <DetailInput
                  label="거래처코드"
                  value={detailPopupRow.isRegister ? '자동 생성' : detailPopupRow.cstCd}
                  readOnly
                />
                <DetailInput
                  label="거래처명"
                  value={detailPopupRow.cstNm}
                  onChange={(value) => updateDetailPopup({ cstNm: value })}
                />
                <DetailInput
                  label="거래처구분"
                  value={detailPopupRow.custGb}
                  readOnly
                />
                <DetailInput
                  label="사업자번호"
                  value={detailPopupRow.regNo}
                  maxLength={12}
                  onChange={(value) => updateDetailPopup({ regNo: formatRegNo(value) })}
                />
                <DetailInput
                  label="대표자명"
                  value={detailPopupRow.ceoNm}
                  onChange={(value) => updateDetailPopup({ ceoNm: value })}
                />
                <DetailInput
                  label="담당자"
                  value={detailPopupRow.mgrNm}
                  onChange={(value) => updateDetailPopup({ mgrNm: value })}
                />
                <DetailInput
                  label="전화번호"
                  value={detailPopupRow.telNo}
                  onChange={(value) => updateDetailPopup({ telNo: onlyDigits(value, 12) })}
                />
                <DetailInput
                  label="담당자연락처"
                  value={detailPopupRow.mgrTel}
                  onChange={(value) => updateDetailPopup({ mgrTel: onlyDigits(value, 12) })}
                />
                <DetailInput
                  label="이메일"
                  value={detailPopupRow.email}
                  onChange={(value) => updateDetailPopup({ email: value })}
                />
                <DetailInput
                  label="팩스번호"
                  value={detailPopupRow.faxNo}
                  onChange={(value) => updateDetailPopup({ faxNo: onlyDigits(value, 12) })}
                />
                <DetailInput
                  label="우편번호"
                  value={detailPopupRow.postNo}
                  onChange={(value) => updateDetailPopup({ postNo: onlyDigits(value, 5) })}
                />
                <DetailSelect
                  label="상태"
                  value={detailPopupRow.status}
                  onChange={(value) => updateDetailPopup({ status: value })}
                />
                <div className="md:col-span-2">
                  <DetailTextarea
                    label="주소"
                    value={detailPopupRow.addr}
                    onChange={(value) => updateDetailPopup({ addr: value })}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
}
