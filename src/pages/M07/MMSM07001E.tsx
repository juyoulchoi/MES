import { useState } from 'react';
import { http } from '@/lib/http';

// 사용자 관리 (MMSM07001E)
// 단일 그리드 편집: 조회/추가/저장/삭제/엑셀
// 필터: 사용자 이름(USR_NM), 사용자그룹(USR_GRP_CD), 부서(DEPT_CD), 사용여부(USE_YN)

type Row = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SERL?: number | string;
  USR_ID?: string;
  USR_NM?: string;
  PWD?: string;
  DEPT_CD?: string;
  DEPT_NM?: string;
  USR_GRP_CD?: string;
  USE_YN?: string; // 'Y' | 'N'
  [k: string]: any;
};

export default function MMSM07001E() {
  // Filters
  const [usrNm, setUsrNm] = useState('');
  const [usrGrpCd, setUsrGrpCd] = useState('');
  const [deptCd, setDeptCd] = useState('');
  const [useYn, setUseYn] = useState(''); // '' 전체, 'Y', 'N'

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (usrNm) params.set('usr_nm', usrNm);
      if (usrGrpCd) params.set('usr_grp_cd', usrGrpCd);
      if (deptCd) params.set('dept_cd', deptCd);
      if (useYn) params.set('use_yn', useYn);
      const url = `/api/m07/mmsm07001/list` + (params.toString() ? `?${params.toString()}` : '');
      const data = await http<Row[]>(url);
      const list = (Array.isArray(data) ? data : []).map((r, i) => ({
        CHECK: false,
        ISNEW: !!r.ISNEW,
        SERL: r.SERL ?? i + 1,
        USR_ID: r.USR_ID ?? '',
        USR_NM: r.USR_NM ?? '',
        PWD: r.PWD ?? '',
        DEPT_CD: r.DEPT_CD ?? '',
        DEPT_NM: r.DEPT_NM ?? '',
        USR_GRP_CD: r.USR_GRP_CD ?? '',
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
      { CHECK: true, ISNEW: true, SERL: prev.length + 1, USR_ID: '', USR_NM: '', PWD: '', DEPT_CD: '', DEPT_NM: '', USR_GRP_CD: '', USE_YN: 'Y' }
    ]));
  }

  async function onDelete() {
    const targets = rows.filter(r => r.CHECK && !r.ISNEW).map(r => r.USR_ID).filter(Boolean) as string[];
    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        const payload = targets.map(id => ({ USR_ID: id }));
        await http(`/api/m07/mmsm07001/delete`, { method: 'POST', body: payload });
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
        USR_ID: r.USR_ID ?? '',
        USR_NM: r.USR_NM ?? '',
        PWD: r.PWD ?? '',
        DEPT_CD: r.DEPT_CD ?? '',
        DEPT_NM: r.DEPT_NM ?? '',
        USR_GRP_CD: r.USR_GRP_CD ?? '',
        USE_YN: r.USE_YN ?? 'Y',
        ISNEW: !!r.ISNEW,
      }));
      await http(`/api/m07/mmsm07001/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['No.','사용자ID','사용자이름','패스워드','부서코드','부서명','사용자그룹','사용여부'];
    const lines = rows.map((r, i) => [
      r.SERL ?? i + 1,
      r.USR_ID ?? '',
      r.USR_NM ?? '',
      r.PWD ?? '',
      r.DEPT_CD ?? '',
      r.DEPT_NM ?? '',
      r.USR_GRP_CD ?? '',
      r.USE_YN ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM07001E_users.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">사용자 관리</div>

      {/* Filters & Buttons */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">사용자 이름</span>
          <input className="h-8 border rounded px-2 w-40" value={usrNm} onChange={e=>setUsrNm(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">사용자그룹</span>
          <input className="h-8 border rounded px-2 w-32" value={usrGrpCd} onChange={e=>setUsrGrpCd(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">부서</span>
          <input className="h-8 border rounded px-2 w-32" value={deptCd} onChange={e=>setDeptCd(e.target.value)} />
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
              <th className="w-32 p-2 text-center">사용자 ID</th>
              <th className="w-40 p-2 text-left">사용자 이름</th>
              <th className="w-40 p-2 text-left">패스워드</th>
              <th className="w-32 p-2 text-left">부서코드</th>
              <th className="w-40 p-2 text-left">부서명</th>
              <th className="w-40 p-2 text-center">사용자그룹</th>
              <th className="w-24 p-2 text-center">사용여부</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggle(i, e.target.checked)} /></td>
                <td className="p-2 text-center">{r.SERL ?? i + 1}</td>
                <td className="p-1 text-center"><input className={`h-8 border rounded px-2 w-full ${!r.USR_ID ? 'border-destructive' : ''}`} value={r.USR_ID ?? ''} onChange={e => patch(i, { USR_ID: e.target.value })} /></td>
                <td className="p-1"><input className={`h-8 border rounded px-2 w-full ${!r.USR_NM ? 'border-destructive' : ''}`} value={r.USR_NM ?? ''} onChange={e => patch(i, { USR_NM: e.target.value })} /></td>
                <td className="p-1"><input type="password" className="h-8 border rounded px-2 w-full" value={r.PWD ?? ''} onChange={e => patch(i, { PWD: e.target.value })} /></td>
                <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.DEPT_CD ?? ''} onChange={e => patch(i, { DEPT_CD: e.target.value })} /></td>
                <td className="p-1"><div className="flex gap-2"><input className="h-8 border rounded px-2 w-full" value={r.DEPT_NM ?? ''} onChange={e => patch(i, { DEPT_NM: e.target.value })} /><button className="h-8 px-2 border rounded" onClick={() => alert('부서 검색 팝업은 추후 연동 예정입니다.')}>검색</button></div></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.USR_GRP_CD ?? ''} onChange={e => patch(i, { USR_GRP_CD: e.target.value })} /></td>
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
                <td colSpan={9} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 설정하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
