import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 외주입출고관리 (MMSM02006E)
// 필터: 수주일자(시작/끝), 외주구분
// 기능: 조회, 저장(체크된 행), 엑셀(CSV)
// 그리드 주요 컬럼: 순번, 품명, 거래처명, 외주코드, 외주구분, 업체명, 출고일자, 출고수량, 입고요청일자, 입고일자, 입고수량(편집), 외주직접출고여부(편집), 비고

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

function toInputDate(s: string | undefined) {
  if (!s) return '';
  const t = String(s).trim();
  if (/^\d{8}$/.test(t)) return `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`;
  if (/^\d{4}[.-]\d{2}[.-]\d{2}$/.test(t)) return t.replace(/[.]/g, '-');
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return '';
}

function fromInputToYMD(s: string) {
  if (!s) return '';
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t.replace(/-/g, '');
  if (/^\d{4}[.]-\d{2}[.]-\d{2}$/.test(t)) return t.replace(/[.]/g, '');
  return '';
}

export default function MMSM02006E() {
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [outGb, setOutGb] = useState('');

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const qs = new URLSearchParams({ start: toYMD(startDate), end: toYMD(endDate), out_gb: outGb || '' }).toString();
      const data = await http<Row[]>(`/api/m02/mmsm02006/list?${qs}`);
      const list = (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
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
        // 식별자(백엔드 협의 필요): RNUM, OUT_CD 등 사용
        RNUM: r.RNUM ?? '',
        OUT_CD: r.OUT_CD ?? '',
        // 변경 가능 필드
        OUT_DT: fromInputToYMD(toInputDate(r.OUT_DT)),
        IN_PRD_DT: fromInputToYMD(toInputDate(r.IN_PRD_DT)),
        IN_DT: fromInputToYMD(toInputDate(r.IN_DT)),
        IN_QTY: r.IN_QTY ?? '',
        OUT_DIR_YN: r.OUT_DIR_YN ?? '',
        DESC: r.DESC ?? '',
      }));
      await http(`/api/m02/mmsm02006/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const headers = ['순번','품명','거래처명','외주코드','외주구분','업체명','출고일자','출고수량','입고요청일자','입고일자','입고수량','외주직접출고여부','비고'];
    const lines = rows.map((r, i) => [
      r.RNUM ?? i + 1,
      r.ITEM_NM ?? '',
      r.CST_NM ?? '',
      r.OUT_CD ?? '',
      r.OUT_GB ?? r.Out_GB ?? '',
      r.BUS_NM ?? '',
      r.OUT_DT ?? '',
      r.OUT_QTY ?? '',
      r.IN_PRD_DT ?? '',
      r.IN_DT ?? '',
      r.IN_QTY ?? '',
      r.OUT_DIR_YN ?? '',
      r.DESC ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM02006E.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">외주입출고관리</div>

      {/* Filters & Buttons */}
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
          <span className="mb-1">외주구분</span>
          <input className="h-8 border rounded px-2" value={outGb} onChange={(e) => setOutGb(e.target.value)} placeholder="외주구분" />
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
              <th className="w-40 p-2 text-left">품명</th>
              <th className="w-36 p-2 text-left">거래처명</th>
              <th className="w-0 p-2 text-center">외주코드</th>
              <th className="w-24 p-2 text-center">외주구분</th>
              <th className="w-36 p-2 text-left">업체명</th>
              <th className="w-28 p-2 text-center">출고일자</th>
              <th className="w-24 p-2 text-right">출고수량</th>
              <th className="w-28 p-2 text-center">입고요청일자</th>
              <th className="w-28 p-2 text-center">입고일자</th>
              <th className="w-24 p-2 text-right">입고수량</th>
              <th className="w-32 p-2 text-center">외주직접출고여부</th>
              <th className="w-64 p-2 text-left">비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggle(i, e.target.checked)} /></td>
                <td className="p-2 text-center">{r.RNUM ?? i + 1}</td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_NM ?? ''} readOnly /></td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.CST_NM ?? ''} readOnly /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.OUT_CD ?? ''} readOnly /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.OUT_GB ?? r.Out_GB ?? ''} readOnly /></td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.BUS_NM ?? ''} readOnly /></td>
                <td className="p-1 text-center"><input type="date" className="h-8 border rounded px-2 w-full" value={toInputDate(r.OUT_DT)} onChange={e => onChange(i, { OUT_DT: e.target.value })} /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right bg-muted" value={r.OUT_QTY ?? ''} readOnly /></td>
                <td className="p-1 text-center"><input type="date" className="h-8 border rounded px-2 w-full" value={toInputDate(r.IN_PRD_DT)} onChange={e => onChange(i, { IN_PRD_DT: e.target.value })} /></td>
                <td className="p-1 text-center"><input type="date" className="h-8 border rounded px-2 w-full" value={toInputDate(r.IN_DT)} onChange={e => onChange(i, { IN_DT: e.target.value })} /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.IN_QTY ?? ''} onChange={e => onChange(i, { IN_QTY: e.target.value })} /></td>
                <td className="p-1 text-center">
                  <select className="h-8 border rounded px-2 w-full" value={r.OUT_DIR_YN ?? ''} onChange={e => onChange(i, { OUT_DIR_YN: e.target.value })}>
                    <option value=""></option>
                    <option value="Y">외주출고</option>
                    <option value="N">입고출고</option>
                  </select>
                </td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.DESC ?? ''} readOnly /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={14} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 선택하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
