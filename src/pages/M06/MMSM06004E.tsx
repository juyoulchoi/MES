import { useState } from 'react';
import { http } from '@/lib/http';

// 거래처 관리 (MMSM06004E)
// 단일 그리드 편집: 조회/추가/저장/삭제/엑셀
// 필터: 거래처구분(CST_GB), 사용여부(USE_YN)

type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SERL?: number | string;
  CST_CD?: string; // 읽기전용(신규 저장 시 서버 발번 가정)
  CST_NM?: string;
  REG_NO?: string;
  CST_GB?: string;
  CEO_NM?: string;
  MGR_NM?: string;
  MGR_TEL?: string;
  TEL_NO?: string;
  FAX_NO?: string;
  EMAIL?: string;
  POST_NO?: string;
  ADDR?: string;
  USE_YN?: string; // 'Y' | 'N'
  [k: string]: any;
};

export default function MMSM06004E() {
  // Filters
  const [cstGb, setCstGb] = useState('');
  const [useYn, setUseYn] = useState(''); // '' 전체, 'Y', 'N'

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (cstGb) params.set('cst_gb', cstGb);
      if (useYn) params.set('use_yn', useYn);
      const url = `/api/m06/mmsm06004/list` + (params.toString() ? `?${params.toString()}` : '');
      const data = await http<Row[]>(url);
      const list = (Array.isArray(data) ? data : []).map((r, i) => ({
        CHECK: false,
        ISNEW: !!r.ISNEW,
        SERL: r.SERL ?? i + 1,
        CST_CD: r.CST_CD ?? '',
        CST_NM: r.CST_NM ?? '',
        REG_NO: r.REG_NO ?? '',
        CST_GB: r.CST_GB ?? '',
        CEO_NM: r.CEO_NM ?? '',
        MGR_NM: r.MGR_NM ?? '',
        MGR_TEL: r.MGR_TEL ?? '',
        TEL_NO: r.TEL_NO ?? '',
        FAX_NO: r.FAX_NO ?? '',
        EMAIL: r.EMAIL ?? '',
        POST_NO: r.POST_NO ?? '',
        ADDR: r.ADDR ?? '',
        USE_YN: r.USE_YN ?? 'Y',
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
      { CHECK: true, ISNEW: true, SERL: prev.length + 1, CST_CD: '', CST_NM: '', REG_NO: '', CST_GB: '', CEO_NM: '', MGR_NM: '', MGR_TEL: '', TEL_NO: '', FAX_NO: '', EMAIL: '', POST_NO: '', ADDR: '', USE_YN: 'Y' }
    ]));
  }

  async function onDelete() {
    const targets = rows.filter(r => r.CHECK && !r.ISNEW).map(r => r.CST_CD).filter(Boolean) as string[];
    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        const payload = targets.map(cd => ({ CST_CD: cd }));
        await http(`/api/m06/mmsm06004/delete`, { method: 'POST', body: payload });
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
        CST_CD: r.CST_CD ?? '',
        CST_NM: r.CST_NM ?? '',
        REG_NO: r.REG_NO ?? '',
        CST_GB: r.CST_GB ?? '',
        CEO_NM: r.CEO_NM ?? '',
        MGR_NM: r.MGR_NM ?? '',
        MGR_TEL: r.MGR_TEL ?? '',
        TEL_NO: r.TEL_NO ?? '',
        FAX_NO: r.FAX_NO ?? '',
        EMAIL: r.EMAIL ?? '',
        POST_NO: r.POST_NO ?? '',
        ADDR: r.ADDR ?? '',
        USE_YN: r.USE_YN ?? 'Y',
        ISNEW: !!r.ISNEW,
      }));
      await http(`/api/m06/mmsm06004/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['No.','거래처코드','거래처명','사업장등록번호','거래처구분','대표자명','담당자명','담당자연락처','전화번호','팩스번호','이메일','우편번호','주소','사용여부'];
    const lines = rows.map((r, i) => [
      r.SERL ?? i + 1,
      r.CST_CD ?? '',
      r.CST_NM ?? '',
      r.REG_NO ?? '',
      r.CST_GB ?? '',
      r.CEO_NM ?? '',
      r.MGR_NM ?? '',
      r.MGR_TEL ?? '',
      r.TEL_NO ?? '',
      r.FAX_NO ?? '',
      r.EMAIL ?? '',
      r.POST_NO ?? '',
      r.ADDR ?? '',
      r.USE_YN ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM06004E.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">거래처 관리</div>

      {/* Filters & Buttons */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">거래처구분</span>
          <input className="h-8 border rounded px-2 w-40" value={cstGb} onChange={e=>setCstGb(e.target.value)} placeholder="예: Customer/Supplier" />
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
              <th className="w-24 p-2 text-center">거래처코드</th>
              <th className="w-40 p-2 text-left">거래처명</th>
              <th className="w-36 p-2 text-left">사업장등록번호</th>
              <th className="w-24 p-2 text-center">거래처구분</th>
              <th className="w-24 p-2 text-left">대표자명</th>
              <th className="w-24 p-2 text-left">담당자명</th>
              <th className="w-32 p-2 text-left">담당자연락처</th>
              <th className="w-32 p-2 text-left">전화번호</th>
              <th className="w-32 p-2 text-left">팩스번호</th>
              <th className="w-40 p-2 text-left">이메일</th>
              <th className="w-28 p-2 text-left">우편번호</th>
              <th className="p-2 text-left">주소</th>
              <th className="w-20 p-2 text-center">사용여부</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggle(i, e.target.checked)} /></td>
                <td className="p-2 text-center">{r.SERL ?? i + 1}</td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.CST_CD ?? ''} readOnly /></td>
                <td className="p-1"><input className={`h-8 border rounded px-2 w-full ${!r.CST_NM ? 'border-destructive' : ''}`} value={r.CST_NM ?? ''} onChange={e => patch(i, { CST_NM: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.REG_NO ?? ''} onChange={e => patch(i, { REG_NO: e.target.value })} /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.CST_GB ?? ''} onChange={e => patch(i, { CST_GB: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.CEO_NM ?? ''} onChange={e => patch(i, { CEO_NM: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.MGR_NM ?? ''} onChange={e => patch(i, { MGR_NM: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.MGR_TEL ?? ''} onChange={e => patch(i, { MGR_TEL: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.TEL_NO ?? ''} onChange={e => patch(i, { TEL_NO: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.FAX_NO ?? ''} onChange={e => patch(i, { FAX_NO: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.EMAIL ?? ''} onChange={e => patch(i, { EMAIL: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.POST_NO ?? ''} onChange={e => patch(i, { POST_NO: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.ADDR ?? ''} onChange={e => patch(i, { ADDR: e.target.value })} /></td>
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
                <td colSpan={15} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 설정하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
