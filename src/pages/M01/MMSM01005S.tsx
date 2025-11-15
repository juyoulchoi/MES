import { useEffect, useMemo, useState } from 'react';
import { http } from '@/lib/http';
import { useCodes } from '@/lib/hooks/useCodes';

// 원자재 출고현황 (MMSM01005S)
// ASPX 필터 및 컬럼을 반영한 맞춤 구현

type Row = Record<string, any>;

function fmtDateYMD(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, '0');
  const day = `${dt.getDate()}`.padStart(2, '0');
  return `${y}${m}${day}`;
}

export default function MMSM01005S() {
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');
  const [matGb, setMatGb] = useState('');
  const [itemCd, setItemCd] = useState('');
  const [itemNm, setItemNm] = useState('');

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Codes
  const { codes: matCodes } = useCodes('6040', []);

  // Init today for both dates
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = `${today.getMonth() + 1}`.padStart(2, '0');
    const dd = `${today.getDate()}`.padStart(2, '0');
    const ymd = `${yyyy}-${mm}-${dd}`;
    setStartDate(ymd);
    setEndDate(ymd);
  }, []);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        start: fmtDateYMD(startDate),
        end: fmtDateYMD(endDate),
        cst_cd: cstCd || '',
        mat_gb: matGb || '',
        item_cd: itemCd || '',
      }).toString();
      const data = await http<Row[]>(`/api/m01/mmsm01005/list?${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // 고객/제품 선택: 간단 입력 모달 구현
  const [custOpen, setCustOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const [tempCode, setTempCode] = useState('');
  const [tempName, setTempName] = useState('');

  function openCustomerPicker() {
    setTempCode(cstCd);
    setTempName(cstNm);
    setCustOpen(true);
  }
  function applyCustomer() {
    setCstCd(tempCode.trim());
    setCstNm(tempName.trim());
    setCustOpen(false);
  }

  function openProductPicker() {
    setTempCode(itemCd);
    setTempName(itemNm);
    setProdOpen(true);
  }
  function applyProduct() {
    setItemCd(tempCode.trim());
    setItemNm(tempName.trim());
    setProdOpen(false);
  }

  // 엑셀(간단 CSV) 내보내기
  function onExportCsv() {
    const headers = [
      '순번','발주일자','발주상세번호','원자재명','원자재구분','종류','규격','출고위치','출고일자','계획수량','출고수량'
    ];
    const lines = rows.map((r, i) => {
      const planQty = r.PLAN_QTY ?? r.QTY_PLAN ?? r.PLANQTY ?? r.QTY ?? '';
      const outQty = r.GI_QTY ?? r.OUT_QTY ?? r.QTY_OUT ?? r.QTY ?? '';
      return [
        r.RNUM ?? i + 1,
        r.PO_YMD ?? '',
        r.PO_YMD_SEQ ?? '',
        r.ITEM_NM ?? '',
        r.ITEM_GB ?? '',
        r.ITEM_TP ?? '',
        r.STANDARD ?? '',
        r.GI_PO ?? '',
        r.GI_YMD ?? '',
        planQty,
        outQty,
      ].map(v => (v ?? '').toString().replaceAll('"', '""'))
        .map(v => `"${v}` + `"`).join(',');
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM01005S.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">원자재 출고현황</div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">출고일자(시작)</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 border rounded px-2" />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">출고일자(끝)</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 border rounded px-2" />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">거래처명</span>
          <div className="flex gap-1">
            <input value={cstCd} readOnly className="h-8 border rounded px-2 w-28 bg-muted" placeholder="코드" />
            <input value={cstNm} readOnly className="h-8 border rounded px-2 flex-1 bg-muted" placeholder="거래처 선택" />
            <button type="button" className="h-8 px-2 border rounded" onClick={openCustomerPicker}>...</button>
          </div>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">자재구분</span>
          <select value={matGb} onChange={(e) => setMatGb(e.target.value)} className="h-8 border rounded px-2">
            <option value=""></option>
            {matCodes.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm md:col-span-2 lg:col-span-2">
          <span className="mb-1">제품명</span>
          <div className="flex gap-1">
            <input value={itemCd} readOnly className="h-8 border rounded px-2 w-28 bg-muted" placeholder="코드" />
            <input value={itemNm} readOnly className="h-8 border rounded px-2 flex-1 bg-muted" placeholder="제품 선택" />
            <button type="button" className="h-8 px-2 border rounded" onClick={openProductPicker}>...</button>
          </div>
        </label>
        <div className="flex gap-2 md:col-span-1 lg:col-span-1 justify-end">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Grid */}
      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-16 p-2 text-center">순번</th>
              <th className="w-28 p-2 text-center">발주일자</th>
              <th className="w-28 p-2 text-center">발주상세번호</th>
              <th className="p-2 text-center">원자재명</th>
              <th className="w-24 p-2 text-center">원자재구분</th>
              <th className="w-32 p-2 text-left">종류</th>
              <th className="w-28 p-2 text-center">규격</th>
              <th className="w-28 p-2 text-center">출고위치</th>
              <th className="w-28 p-2 text-center">출고일자</th>
              <th className="w-24 p-2 text-right">계획수량</th>
              <th className="w-24 p-2 text-right">출고수량</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const planQty = r.PLAN_QTY ?? r.QTY_PLAN ?? r.PLANQTY ?? r.QTY ?? '';
              const outQty = r.GI_QTY ?? r.OUT_QTY ?? r.QTY_OUT ?? r.QTY ?? '';
              return (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-center">{r.RNUM ?? i + 1}</td>
                  <td className="p-2 text-center">{r.PO_YMD ?? ''}</td>
                  <td className="p-2 text-center">{r.PO_YMD_SEQ ?? ''}</td>
                  <td className="p-2 text-center">{r.ITEM_NM ?? ''}</td>
                  <td className="p-2 text-center">{r.ITEM_GB ?? ''}</td>
                  <td className="p-2">{r.ITEM_TP ?? ''}</td>
                  <td className="p-2 text-center">{r.STANDARD ?? ''}</td>
                  <td className="p-2 text-center">{r.GI_PO ?? ''}</td>
                  <td className="p-2 text-center">{r.GI_YMD ?? ''}</td>
                  <td className="p-2 text-right">{planQty}</td>
                  <td className="p-2 text-right">{outQty}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 선택하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 고객/제품 간단 선택 모달 */}
      {custOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-background border rounded p-3 w-[460px] space-y-2 shadow-lg">
            <div className="font-semibold">고객사 선택</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col text-sm">
                <span className="mb-1">코드</span>
                <input className="h-8 border rounded px-2" value={tempCode} onChange={(e) => setTempCode(e.target.value)} />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1">이름</span>
                <input className="h-8 border rounded px-2" value={tempName} onChange={(e) => setTempName(e.target.value)} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="h-8 px-3 border rounded" onClick={() => setCustOpen(false)}>취소</button>
              <button className="h-8 px-3 border rounded bg-primary text-primary-foreground" onClick={applyCustomer}>선택</button>
            </div>
          </div>
        </div>
      )}

      {prodOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-background border rounded p-3 w-[460px] space-y-2 shadow-lg">
            <div className="font-semibold">제품 선택</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col text-sm">
                <span className="mb-1">코드</span>
                <input className="h-8 border rounded px-2" value={tempCode} onChange={(e) => setTempCode(e.target.value)} />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1">이름</span>
                <input className="h-8 border rounded px-2" value={tempName} onChange={(e) => setTempName(e.target.value)} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="h-8 px-3 border rounded" onClick={() => setProdOpen(false)}>취소</button>
              <button className="h-8 px-3 border rounded bg-primary text-primary-foreground" onClick={applyProduct}>선택</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
