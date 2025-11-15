import { useState } from 'react';
import { http } from '@/lib/http';

// 작업장 관리 (MMSM06007E)
// 단일 그리드: 조회/추가/저장/삭제/엑셀
// 필터: 작업장명(line_nm)

type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  DSP_SEQ?: string | number;
  LINE_CD?: string;
  LINE_GRP_CD?: string;
  LINE_NM?: string;
  USE_YN?: string; // 'Y' | 'N'
  [k: string]: any;
};

export default function MMSM06007E() {
  // Filters
  const [lineNm, setLineNm] = useState('');

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams();
      if (lineNm) qs.set('line_nm', lineNm);
      const url = `/api/m06/mmsm06007/list` + (qs.toString() ? `?${qs.toString()}` : '');
      const data = await http<Row[]>(url);
      const list = (Array.isArray(data) ? data : []).map((r, i) => ({
        CHECK: false,
        ISNEW: !!r.ISNEW,
        DSP_SEQ: r.DSP_SEQ ?? i + 1,
        LINE_CD: r.LINE_CD ?? '',
        LINE_GRP_CD: r.LINE_GRP_CD ?? '',
        LINE_NM: r.LINE_NM ?? '',
        USE_YN: r.USE_YN ?? 'Y',
      }));
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function toggle(i: number, checked: boolean) {
    setRows(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }
  function patch(i: number, patch: Partial<Row>) {
    setRows(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch, CHECK: true }; return next; });
  }
  function onAdd() {
    setRows(prev => ([
      ...prev,
      { CHECK: true, ISNEW: true, DSP_SEQ: prev.length + 1, LINE_CD: '', LINE_GRP_CD: '', LINE_NM: '', USE_YN: 'Y' }
    ]));
  }

  async function onDelete() {
    const targets = rows.filter(r => r.CHECK && !r.ISNEW).map(r => r.LINE_CD).filter(Boolean) as string[];
    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        const payload = targets.map(cd => ({ LINE_CD: cd }));
        await http(`/api/m06/mmsm06007/delete`, { method: 'POST', body: payload });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally { setLoading(false); }
    }
    setRows(prev => prev.filter(r => !r.CHECK));
  }

  async function onSave() {
    const targets = rows.filter(r => r.CHECK || r.ISNEW);
    if (targets.length === 0) { setError('저장할 대상이 없습니다.'); return; }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true); setError(null);
    try {
      const payload = targets.map(r => ({
        DSP_SEQ: r.DSP_SEQ ?? '',
        LINE_CD: r.LINE_CD ?? '',
        LINE_GRP_CD: r.LINE_GRP_CD ?? '',
        LINE_NM: r.LINE_NM ?? '',
        USE_YN: r.USE_YN ?? 'Y',
        ISNEW: !!r.ISNEW,
      }));
      await http(`/api/m06/mmsm06007/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['표시순서','작업장코드','작업장그룹코드','작업장명','사용여부'];
    const lines = rows.map((r) => [
      r.DSP_SEQ ?? '',
      r.LINE_CD ?? '',
      r.LINE_GRP_CD ?? '',
      r.LINE_NM ?? '',
      r.USE_YN ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM06007E.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">작업장 관리</div>

      {/* Filters & Buttons */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">작업장명</span>
          <input className="h-8 border rounded px-2 w-60" value={lineNm} onChange={e=>setLineNm(e.target.value)} />
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onAdd} disabled={loading} className="h-8 px-3 border rounded">추가</button>
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
          <button onClick={onDelete} disabled={loading} className="h-8 px-3 border rounded">삭제</button>
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
              <th className="w-16 p-2 text-center">표시순서</th>
              <th className="w-24 p-2 text-center">작업장코드</th>
              <th className="w-32 p-2 text-center">작업장그룹코드</th>
              <th className="p-2 text-left">작업장명</th>
              <th className="w-20 p-2 text-center">사용여부</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggle(i, e.target.checked)} /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full text-center" value={r.DSP_SEQ ?? ''} onChange={e => patch(i, { DSP_SEQ: e.target.value })} /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.LINE_CD ?? ''} onChange={e => patch(i, { LINE_CD: e.target.value })} /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.LINE_GRP_CD ?? ''} onChange={e => patch(i, { LINE_GRP_CD: e.target.value })} /></td>
                <td className="p-1"><input className={`h-8 border rounded px-2 w-full ${!r.LINE_NM ? 'border-destructive' : ''}`} value={r.LINE_NM ?? ''} onChange={e => patch(i, { LINE_NM: e.target.value })} /></td>
                <td className="p-1 text-center">
                  <select className="h-8 border rounded px-2 w-full" value={r.USE_YN ?? 'Y'} onChange={e => patch(i, { USE_YN: e.target.value })}>
                    <option value="Y">Y</option>
                    <option value="N">N</option>
                  </select>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 설정하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
