import { useState } from 'react';
import { http } from '@/lib/http';

// 프로그램 관리 (MMSM07002E)
// 단일 그리드 편집: 조회/추가/저장/삭제/엑셀
// 필터: 프로그램ID(PGM_ID), 프로그램명(PGM_NM), 사용여부(USE_YN)

type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SERL?: number | string;
  PGM_ID?: string;
  PGM_NM?: string;
  PGM_URL?: string;
  USE_YN?: string; // 'Y' | 'N'
  DESC?: string;
  [k: string]: any;
};

export default function MMSM07002E() {
  // Filters
  const [pgmId, setPgmId] = useState('');
  const [pgmNm, setPgmNm] = useState('');
  const [useYn, setUseYn] = useState(''); // '' 전체, 'Y', 'N'

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (pgmId) params.set('pgm_id', pgmId);
      if (pgmNm) params.set('pgm_nm', pgmNm);
      if (useYn) params.set('use_yn', useYn);
      const url = `/api/m07/mmsm07002/list` + (params.toString() ? `?${params.toString()}` : '');
      const data = await http<Row[]>(url);
      const list = (Array.isArray(data) ? data : []).map((r, i) => ({
        CHECK: false,
        ISNEW: !!r.ISNEW,
        SERL: r.SERL ?? i + 1,
        PGM_ID: r.PGM_ID ?? '',
        PGM_NM: r.PGM_NM ?? '',
        PGM_URL: r.PGM_URL ?? '',
        USE_YN: r.USE_YN ?? 'Y',
        DESC: r.DESC ?? '',
      } as Row));
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
      { CHECK: true, ISNEW: true, SERL: prev.length + 1, PGM_ID: '', PGM_NM: '', PGM_URL: '', USE_YN: 'Y', DESC: '' }
    ]));
  }

  async function onDelete() {
    const targets = rows.filter(r => r.CHECK && !r.ISNEW).map(r => r.PGM_ID).filter(Boolean) as string[];
    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        const payload = targets.map(id => ({ PGM_ID: id }));
        await http(`/api/m07/mmsm07002/delete`, { method: 'POST', body: payload });
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
        PGM_ID: r.PGM_ID ?? '',
        PGM_NM: r.PGM_NM ?? '',
        PGM_URL: r.PGM_URL ?? '',
        USE_YN: r.USE_YN ?? 'Y',
        DESC: r.DESC ?? '',
        ISNEW: !!r.ISNEW,
      }));
      await http(`/api/m07/mmsm07002/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['No.','프로그램ID','프로그램명','URL','사용여부','기능설명'];
    const lines = rows.map((r, i) => [
      r.SERL ?? i + 1,
      r.PGM_ID ?? '',
      r.PGM_NM ?? '',
      r.PGM_URL ?? '',
      r.USE_YN ?? '',
      r.DESC ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM07002E_programs.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">프로그램 관리</div>

      {/* Filters & Buttons */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">프로그램ID</span>
          <input className="h-8 border rounded px-2 w-40" value={pgmId} onChange={e=>setPgmId(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">프로그램명</span>
          <input className="h-8 border rounded px-2 w-48" value={pgmNm} onChange={e=>setPgmNm(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">사용여부</span>
          <select className="h-8 border rounded px-2 w-28" value={useYn} onChange={e=>setUseYn(e.target.value)}>
            <option value="">전체</option>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
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
              <th className="w-12 p-2 text-center">No.</th>
              <th className="w-40 p-2 text-left">프로그램ID</th>
              <th className="w-56 p-2 text-left">프로그램명</th>
              <th className="w-72 p-2 text-left">URL</th>
              <th className="w-24 p-2 text-center">사용여부</th>
              <th className="p-2 text-left">기능설명</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggle(i, e.target.checked)} /></td>
                <td className="p-2 text-center">{r.SERL ?? i + 1}</td>
                <td className="p-1"><input className={`h-8 border rounded px-2 w-full ${!r.PGM_ID ? 'border-destructive' : ''}`} value={r.PGM_ID ?? ''} onChange={e => patch(i, { PGM_ID: e.target.value })} /></td>
                <td className="p-1"><input className={`h-8 border rounded px-2 w-full ${!r.PGM_NM ? 'border-destructive' : ''}`} value={r.PGM_NM ?? ''} onChange={e => patch(i, { PGM_NM: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.PGM_URL ?? ''} onChange={e => patch(i, { PGM_URL: e.target.value })} readOnly /></td>
                <td className="p-1 text-center">
                  <select className="h-8 border rounded px-2 w-full" value={r.USE_YN ?? 'Y'} onChange={e => patch(i, { USE_YN: e.target.value })}>
                    <option value="Y">Y</option>
                    <option value="N">N</option>
                  </select>
                </td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.DESC ?? ''} onChange={e => patch(i, { DESC: e.target.value })} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 설정하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
