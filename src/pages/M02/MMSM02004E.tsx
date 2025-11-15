import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 생산현황(편집) - MMSM02004E
// 필터: 수주일자(시작/끝), 공정
// 기능: 조회, 저장, 엑셀(CSV)
// 그리드: 작업일자, 공정, 제품명, 거래처명, 계획수량, 생산수량(편집)

 type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  REQ_YMD?: string;       // 작업일자
  PROC_CD?: string;       // 공정코드(내부)
  LINE_NM?: string;       // 공정명(표시)
  ITEM_CD?: string;       // 제품코드(내부키 가능성)
  ITEM_NM?: string;       // 제품명
  CST_NM?: string;        // 거래처명
  PRD_QTY?: string|number;// 계획수량
  QTY?: string|number;    // 생산수량(편집)
};

function toYMD(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, '0');
  const day = `${dt.getDate()}`.padStart(2, '0');
  return `${y}${m}${day}`;
}

export default function MMSM02004E() {
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [proc, setProc] = useState(''); // 공정 필터(코드 또는 명)

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 공정 선택 모달(행단위)
  const [procModal, setProcModal] = useState<{ open: boolean; index: number | null; code: string; name: string }>({ open: false, index: null, code: '', name: '' });

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
        start: toYMD(startDate),
        end: toYMD(endDate),
        proc: proc || '',
      }).toString();
      const data = await http<Row[]>(`/api/m02/mmsm02004/list?${qs}`);
      const list = (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false, ISNEW: false }));
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number, checked: boolean) {
    setRows(prev => {
      const next = [...prev];
      next[i] = { ...next[i], CHECK: checked };
      return next;
    });
  }

  function onChange(i: number, patch: Partial<Row>) {
    setRows(prev => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch, CHECK: true };
      return next;
    });
  }

  function openProcPicker(i: number) {
    const r = rows[i];
    setProcModal({ open: true, index: i, code: r.PROC_CD || '', name: r.LINE_NM || '' });
  }
  function applyProcPicker() {
    if (procModal.index == null) return;
    onChange(procModal.index, { PROC_CD: procModal.code, LINE_NM: procModal.name });
    setProcModal({ open: false, index: null, code: '', name: '' });
  }

  function onExportCsv() {
    const headers = ['선택','작업일자','공정','제품명','거래처명','계획수량','생산수량'];
    const lines = rows.map(r => [
      r.CHECK ? 'Y' : '',
      r.REQ_YMD ?? '',
      r.LINE_NM ?? '',
      r.ITEM_NM ?? '',
      r.CST_NM ?? '',
      r.PRD_QTY ?? '',
      r.QTY ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM02004E.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function onSave() {
    const targets = rows.filter(r => r.CHECK);
    if (targets.length === 0) {
      setError('저장할 대상이 없습니다.');
      return;
    }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      const payload = targets.map(r => ({
        METHOD: r.ISNEW ? 'I' : 'U',
        REQ_YMD: r.REQ_YMD ?? '',
        PROC_CD: r.PROC_CD ?? '',
        ITEM_CD: r.ITEM_CD ?? '',
        QTY: r.QTY ?? '',
      }));
      await http(`/api/m02/mmsm02004/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">생산현황(편집)</div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">수주일자(시작)</span>
          <input type="date" className="h-8 border rounded px-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">수주일자(끝)</span>
          <input type="date" className="h-8 border rounded px-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm md:col-span-2">
          <span className="mb-1">공정</span>
          <input className="h-8 border rounded px-2" value={proc} onChange={(e) => setProc(e.target.value)} placeholder="공정코드/명" />
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
              <th className="w-28 p-2 text-center">작업일자</th>
              <th className="w-40 p-2 text-left">공정</th>
              <th className="w-40 p-2 text-left">제품명</th>
              <th className="w-36 p-2 text-left">거래처명</th>
              <th className="w-28 p-2 text-right">계획수량</th>
              <th className="w-28 p-2 text-right">생산수량</th>
              <th className="w-16 p-2 text-center">공정선택</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggle(i, e.target.checked)} /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.REQ_YMD ?? ''} readOnly /></td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full" value={r.LINE_NM ?? ''} onChange={e => onChange(i, { LINE_NM: e.target.value })} /></td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_NM ?? ''} readOnly /></td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.CST_NM ?? ''} readOnly /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right bg-muted" value={r.PRD_QTY ?? ''} readOnly /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.QTY ?? ''} onChange={e => onChange(i, { QTY: e.target.value })} /></td>
                <td className="p-1 text-center"><button className="h-8 px-2 border rounded" onClick={() => openProcPicker(i)}>...</button></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 선택하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 공정 선택 모달 */}
      {procModal.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-background border rounded p-3 w-[480px] space-y-2 shadow-lg">
            <div className="font-semibold">공정 선택</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col text-sm">
                <span className="mb-1">공정코드</span>
                <input className="h-8 border rounded px-2" value={procModal.code} onChange={(e) => setProcModal(s => ({ ...s, code: e.target.value }))} />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1">공정명</span>
                <input className="h-8 border rounded px-2" value={procModal.name} onChange={(e) => setProcModal(s => ({ ...s, name: e.target.value }))} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="h-8 px-3 border rounded" onClick={() => setProcModal({ open: false, index: null, code: '', name: '' })}>취소</button>
              <button className="h-8 px-3 border rounded bg-primary text-primary-foreground" onClick={applyProcPicker}>선택</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
