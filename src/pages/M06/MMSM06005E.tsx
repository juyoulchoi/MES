import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 라우팅 관리 (MMSM06005E)
// 좌: 공정그룹 목록 | 중간 버튼(추가/삭제) | 우: 상단 전체 공정 목록, 하단 그룹 공정 목록
// 기능: 그룹 선택 시 우측 두 목록 로드, 선택 후 추가/삭제, CSV 내보내기

type Row = Record<string, any>;

type GroupRow = {
  CHECK?: boolean;
  PROC_GRP_CD?: string;
  PROC_GRP_NM?: string;
  [k: string]: any;
};

type ProcRow = {
  CHECK?: boolean;
  PROC_CD?: string;
  PROC_NM?: string;
  [k: string]: any;
};

export default function MMSM06005E() {
  // Data
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [procs, setProcs] = useState<ProcRow[]>([]); // 전체 공정
  const [grpProcs, setGrpProcs] = useState<ProcRow[]>([]); // 그룹 공정
  const [selectedGrp, setSelectedGrp] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchGroups() {
    const data = await http<GroupRow[]>(`/api/m06/mmsm06005/groups`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }
  async function fetchProcs() {
    const data = await http<ProcRow[]>(`/api/m06/mmsm06005/procs`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }
  async function fetchGroupProcs(grp: string) {
    if (!grp) return [] as ProcRow[];
    const qs = new URLSearchParams({ grp_cd: grp }).toString();
    const data = await http<ProcRow[]>(`/api/m06/mmsm06005/group-procs?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const [g, p] = await Promise.all([fetchGroups(), fetchProcs()]);
      setGroups(g);
      setProcs(p);
      const grp = g[0]?.PROC_GRP_CD || '';
      setSelectedGrp(grp);
      const gp = await fetchGroupProcs(grp);
      setGrpProcs(gp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function onSelectGroup(i: number) {
    const grp = groups[i]?.PROC_GRP_CD || '';
    setSelectedGrp(grp);
    setLoading(true); setError(null);
    try {
      const [p, gp] = await Promise.all([fetchProcs(), fetchGroupProcs(grp)]);
      setProcs(p);
      setGrpProcs(gp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function toggleGroup(i: number, checked: boolean) {
    setGroups(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }
  function toggleProcs(listSetter: (updater: (prev: ProcRow[]) => ProcRow[]) => void, i: number, checked: boolean) {
    listSetter(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }

  async function onAddProcsToGroup() {
    if (!selectedGrp) { setError('좌측에서 공정그룹을 선택하세요.'); return; }
    const targets = procs.filter(r => r.CHECK).map(r => r.PROC_CD).filter(Boolean) as string[];
    if (targets.length === 0) { setError('추가할 공정을 선택하세요.'); return; }
    setLoading(true); setError(null);
    try {
      const payload = targets.map(cd => ({ PROC_GRP_CD: selectedGrp, PROC_CD: cd }));
      await http(`/api/m06/mmsm06005/add`, { method: 'POST', body: payload });
      const gp = await fetchGroupProcs(selectedGrp); setGrpProcs(gp);
      setProcs(prev => prev.map(r => ({ ...r, CHECK: false })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function onRemoveProcsFromGroup() {
    if (!selectedGrp) { setError('좌측에서 공정그룹을 선택하세요.'); return; }
    const targets = grpProcs.filter(r => r.CHECK).map(r => r.PROC_CD).filter(Boolean) as string[];
    if (targets.length === 0) { setError('삭제할 공정을 선택하세요.'); return; }
    setLoading(true); setError(null);
    try {
      const payload = targets.map(cd => ({ PROC_GRP_CD: selectedGrp, PROC_CD: cd }));
      await http(`/api/m06/mmsm06005/delete`, { method: 'POST', body: payload });
      const gp = await fetchGroupProcs(selectedGrp); setGrpProcs(gp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['공정그룹','공정코드','공정명'];
    const lines = grpProcs.map((r) => [
      selectedGrp,
      r.PROC_CD ?? '',
      r.PROC_NM ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM06005E_group_procs.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">라우팅 관리</div>

      {/* Top Buttons */}
      <div className="flex gap-2 justify-end">
        <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
        <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Layout: Groups | Buttons | Right (Procs | Group Procs) */}
      <div className="grid grid-cols-12 gap-3">
        {/* Groups */}
        <div className="col-span-12 md:col-span-3 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-28 p-2 text-center">공정그룹코드</th>
                <th className="p-2 text-left">공정그룹명</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((r, i) => (
                <tr key={i} className={`border-b hover:bg-muted/30 cursor-pointer ${selectedGrp===r.PROC_GRP_CD? 'bg-muted/30': ''}`} onClick={() => onSelectGroup(i)}>
                  <td className="p-2 text-center" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleGroup(i, e.target.checked)} /></td>
                  <td className="p-2 text-center">{r.PROC_GRP_CD ?? ''}</td>
                  <td className="p-2 text-left">{r.PROC_GRP_NM ?? ''}</td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-muted-foreground">공정그룹이 없습니다. 조회를 눌러 로드하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Middle Buttons */}
        <div className="col-span-12 md:col-span-1 flex md:flex-col gap-2 items-center justify-center">
          <button onClick={onRemoveProcsFromGroup} disabled={loading || !selectedGrp} className="h-8 px-3 border rounded">삭제</button>
          <button onClick={onAddProcsToGroup} disabled={loading || !selectedGrp} className="h-8 px-3 border rounded">추가</button>
        </div>

        {/* Right side: Procs | Group Procs */}
        <div className="col-span-12 md:col-span-8 grid grid-rows-2 gap-3">
          {/* All Procs */}
          <div className="border rounded overflow-auto">
            <div className="p-2 text-sm font-medium">전체 공정</div>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="w-12 p-2 text-center">선택</th>
                  <th className="w-28 p-2 text-center">공정코드</th>
                  <th className="p-2 text-left">공정명</th>
                </tr>
              </thead>
              <tbody>
                {procs.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleProcs(setProcs, i, e.target.checked)} /></td>
                    <td className="p-2 text-center">{r.PROC_CD ?? ''}</td>
                    <td className="p-2 text-left">{r.PROC_NM ?? ''}</td>
                  </tr>
                ))}
                {procs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-3 text-center text-muted-foreground">전체 공정 목록이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Group Procs */}
          <div className="border rounded overflow-auto">
            <div className="p-2 text-sm font-medium">그룹 공정</div>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="w-12 p-2 text-center">선택</th>
                  <th className="w-28 p-2 text-center">공정코드</th>
                  <th className="p-2 text-left">공정명</th>
                </tr>
              </thead>
              <tbody>
                {grpProcs.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleProcs(setGrpProcs, i, e.target.checked)} /></td>
                    <td className="p-2 text-center">{r.PROC_CD ?? ''}</td>
                    <td className="p-2 text-left">{r.PROC_NM ?? ''}</td>
                  </tr>
                ))}
                {grpProcs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-3 text-center text-muted-foreground">그룹에 등록된 공정이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
