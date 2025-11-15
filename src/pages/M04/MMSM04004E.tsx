import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 제품재고조정 (MMSM04004E)
// 필터: 품명, 거래처명
// 기능: 조회, 저장(체크된 행), 엑셀(CSV)
// 컬럼: 선택, 순번(RNUM), 품명(ITEM_NM), 거래처명(CST_NM), 재고량(ST_STK, 읽기), 실사량(IN_STK, 편집), 조정량(END_STK, 편집), 조정사유(DESC, 편집)

type Row = Record<string, any>;

export default function MMSM04004E() {
  // Filters
  const [itemNm, setItemNm] = useState('');
  const [cstNm, setCstNm] = useState('');

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 초기 로드시 자동 조회는 하지 않음
  }, []);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ item_nm: itemNm || '', cst_nm: cstNm || '' }).toString();
      const data = await http<Row[]>(`/api/m04/mmsm04004/list?${qs}`);
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
        RNUM: r.RNUM ?? '',
        ITEM_CD: r.ITEM_CD ?? '',
        CST_CD: r.CST_CD ?? '',
        ST_STK: r.ST_STK ?? '',
        IN_STK: r.IN_STK ?? '',
        END_STK: r.END_STK ?? '',
        DESC: r.DESC ?? '',
      }));
      await http(`/api/m04/mmsm04004/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['선택','순번','품명','거래처명','재고량','실사량','조정량','조정사유'];
    const lines = rows.map((r, i) => [
      r.CHECK ? 'Y' : 'N',
      r.RNUM ?? i + 1,
      r.ITEM_NM ?? '',
      r.CST_NM ?? '',
      r.ST_STK ?? '',
      r.IN_STK ?? '',
      r.END_STK ?? '',
      r.DESC ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM04004E.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">제품재고조정</div>

      {/* Filters & Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">품명</span>
          <input className="h-8 border rounded px-2" value={itemNm} onChange={(e) => setItemNm(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">거래처명</span>
          <input className="h-8 border rounded px-2" value={cstNm} onChange={(e) => setCstNm(e.target.value)} />
        </label>
        <div className="flex gap-2 md:col-span-2 justify-end">
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
              <th className="p-2 text-left">품명</th>
              <th className="w-40 p-2 text-left">거래처명</th>
              <th className="w-24 p-2 text-right">재고량</th>
              <th className="w-24 p-2 text-right">실사량</th>
              <th className="w-24 p-2 text-right">조정량</th>
              <th className="w-64 p-2 text-left">조정사유</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggle(i, e.target.checked)} /></td>
                <td className="p-2 text-center">{r.RNUM ?? i + 1}</td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_NM ?? ''} readOnly /></td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.CST_NM ?? ''} readOnly /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right bg-muted" value={r.ST_STK ?? ''} readOnly /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.IN_STK ?? ''} onChange={e => onChange(i, { IN_STK: e.target.value })} /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.END_STK ?? ''} onChange={e => onChange(i, { END_STK: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.DESC ?? ''} onChange={e => onChange(i, { DESC: e.target.value })} /></td>
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
    </div>
  );
}
