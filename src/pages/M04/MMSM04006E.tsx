import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 제품출고지시(단일 그리드 편집) - MMSM04006E
// 필터: 입고일자(단일), 순번, 거래처(코드/명)
// 기능: 조회, 저장(체크된 행), 엑셀(CSV)
// 그리드: 선택, 품목코드/명(읽기), 단위(편집), 수량(편집), 출고지시량(표시), 기출고량(표시), 잔량(표시), 비고(편집)

type Row = Record<string, any>;

function toYMD(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, '0');
  const day = `${dt.getDate()}`.padStart(2, '0');
  return `${y}${m}${day}`;
}

export default function MMSM04006E() {
  // Filters
  const [inDate, setInDate] = useState('');
  const [seq, setSeq] = useState('');
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 고객 간단 선택 모달
  const [custOpen, setCustOpen] = useState(false);
  const [tmpCd, setTmpCd] = useState('');
  const [tmpNm, setTmpNm] = useState('');

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = `${today.getMonth() + 1}`.padStart(2, '0');
    const dd = `${today.getDate()}`.padStart(2, '0');
    const ymd = `${yyyy}-${mm}-${dd}`;
    setInDate(ymd);
  }, []);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ in_ymd: toYMD(inDate), seq: seq || '', cst_cd: cstCd || '' }).toString();
      const data = await http<Row[]>(`/api/m04/mmsm04006/list?${qs}`);
      const list = (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function toggle(i: number, checked: boolean) {
    setRows(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }
  function onChange(i: number, patch: Partial<Row>) {
    setRows(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch, CHECK: true }; return next; });
  }

  async function onSave() {
    const targets = rows.filter(r => r.CHECK);
    if (targets.length === 0) { setError('저장할 대상이 없습니다.'); return; }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true); setError(null);
    try {
      const payload = targets.map(r => ({
        IN_YMD: toYMD(inDate),
        SEQ: seq || '',
        CST_CD: cstCd || '',
        ITEM_CD: r.ITEM_CD ?? '',
        UNIT_CD: r.UNIT_CD ?? '',
        QTY: r.QTY ?? '',
        DESC: r.DESC ?? '',
      }));
      await http(`/api/m04/mmsm04006/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['선택','순번','품목코드','품목명','단위','수량','출고지시량','기출고량','잔량','비고'];
    const lines = rows.map((r, i) => [
      r.CHECK ? 'Y' : 'N',
      r.RNUM ?? i + 1,
      r.ITEM_CD ?? '',
      r.ITEM_NM ?? '',
      r.UNIT_CD ?? '',
      r.QTY ?? '',
      r.GI_PLAN_QTY ?? r.PLAN_QTY ?? '',
      r.GI_QTY ?? '',
      r.REM_QTY ?? r.BAL_QTY ?? '',
      r.DESC ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM04006E.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function openCustomerPicker() { setTmpCd(cstCd); setTmpNm(cstNm); setCustOpen(true); }
  function applyCustomer() { setCstCd(tmpCd.trim()); setCstNm(tmpNm.trim()); setCustOpen(false); }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">제품출고지시</div>

      {/* Filters & Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">입고일자</span>
          <input type="date" className="h-8 border rounded px-2" value={inDate} onChange={(e) => setInDate(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">순번</span>
          <input className="h-8 border rounded px-2" value={seq} onChange={(e) => setSeq(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm md:col-span-2">
          <span className="mb-1">거래처명</span>
          <div className="flex gap-1">
            <input value={cstCd} readOnly className="h-8 border rounded px-2 w-28 bg-muted" placeholder="코드" />
            <input value={cstNm} readOnly className="h-8 border rounded px-2 flex-1 bg-muted" placeholder="거래처 선택" />
            <button type="button" className="h-8 px-2 border rounded" onClick={openCustomerPicker}>...</button>
          </div>
        </label>
        <div className="flex gap-2 justify-end">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Grid */}
      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-12 p-2 text-center">선택</th>
              <th className="w-16 p-2 text-center">순번</th>
              <th className="w-28 p-2 text-center">품목코드</th>
              <th className="p-2 text-left">품목명</th>
              <th className="w-20 p-2 text-center">단위</th>
              <th className="w-24 p-2 text-right">수량</th>
              <th className="w-24 p-2 text-right">출고지시량</th>
              <th className="w-24 p-2 text-right">기출고량</th>
              <th className="w-24 p-2 text-right">잔량</th>
              <th className="w-40 p-2 text-left">비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggle(i, e.target.checked)} /></td>
                <td className="p-2 text-center">{r.RNUM ?? i + 1}</td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_CD ?? ''} readOnly /></td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_NM ?? ''} readOnly /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.UNIT_CD ?? ''} onChange={e => onChange(i, { UNIT_CD: e.target.value })} /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.QTY ?? ''} onChange={e => onChange(i, { QTY: e.target.value })} /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right bg-muted" value={r.GI_PLAN_QTY ?? r.PLAN_QTY ?? ''} readOnly /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right bg-muted" value={r.GI_QTY ?? ''} readOnly /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right bg-muted" value={r.REM_QTY ?? r.BAL_QTY ?? ''} readOnly /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.DESC ?? ''} onChange={e => onChange(i, { DESC: e.target.value })} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 입력하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 고객 선택 모달 */}
      {custOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-background border rounded p-3 w-[460px] space-y-2 shadow-lg">
            <div className="font-semibold">고객사 선택</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col text-sm"><span className="mb-1">코드</span><input className="h-8 border rounded px-2" value={tmpCd} onChange={(e) => setTmpCd(e.target.value)} /></label>
              <label className="flex flex-col text-sm"><span className="mb-1">이름</span><input className="h-8 border rounded px-2" value={tmpNm} onChange={(e) => setTmpNm(e.target.value)} /></label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="h-8 px-3 border rounded" onClick={() => setCustOpen(false)}>취소</button>
              <button className="h-8 px-3 border rounded bg-primary text-primary-foreground" onClick={applyCustomer}>선택</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
