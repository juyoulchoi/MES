import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 권한 관리 (MMSM07004E)
// 좌: 사용자그룹 목록 | 우: 선택된 그룹의 메뉴 권한(조회/편집/출력/EXCEL)
// 상단 필터: 구분(PGM_TYPE), 상위메뉴(MENU_ID) → 우측 권한 목록 필터용

type GroupRow = {
  SERL?: number | string;
  USR_GRP_CD: string;
  USR_GRP_NM: string;
};

type RightRow = {
  USR_GRP_CD: string;
  MENU_ID: string;
  PGMTP_NM?: string; // 구분명
  MENU_NM?: string;
  SER_AUTH?: boolean; // 조회
  SAV_AUTH?: boolean; // 편집
  PRT_AUTH?: boolean; // 출력
  EXL_AUTH?: boolean; // EXCEL
  DIRTY?: boolean; // 변경 추적
};

export default function MMSM07004E() {
  // Filters (우측 권한 목록용)
  const [pgmType, setPgmType] = useState('');
  const [parentMenuId, setParentMenuId] = useState('');

  // Left: Groups
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  // Right: Rights for selected group
  const [rights, setRights] = useState<RightRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 초기 로드: 그룹 목록 후 첫 그룹 선택
    onSearchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearchGroups() {
    setLoading(true); setError(null);
    try {
      const list = await http<GroupRow[]>(`/api/m07/mmsm07004/groups`);
      const g = (Array.isArray(list) ? list : []).map((r, i) => ({
        SERL: r.SERL ?? i + 1,
        USR_GRP_CD: r.USR_GRP_CD,
        USR_GRP_NM: r.USR_GRP_NM,
      }));
      setGroups(g);
      const first = g[0]?.USR_GRP_CD || '';
      setSelectedGroup(first);
      if (first) await loadRights(first);
      else setRights([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function loadRights(groupCd: string) {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (pgmType) params.set('pgm_type', pgmType);
      if (parentMenuId) params.set('menu_id', parentMenuId);
      params.set('usr_grp_cd', groupCd);
      const url = `/api/m07/mmsm07004/rights?${params.toString()}`;
      const list = await http<RightRow[]>(url);
      const arr = (Array.isArray(list) ? list : []).map(r => ({
        USR_GRP_CD: r.USR_GRP_CD ?? groupCd,
        MENU_ID: r.MENU_ID ?? '',
        PGMTP_NM: r.PGMTP_NM ?? '',
        MENU_NM: r.MENU_NM ?? '',
        SER_AUTH: !!r.SER_AUTH,
        SAV_AUTH: !!r.SAV_AUTH,
        PRT_AUTH: !!r.PRT_AUTH,
        EXL_AUTH: !!r.EXL_AUTH,
        DIRTY: false,
      }));
      setRights(arr);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRights([]);
    } finally { setLoading(false); }
  }

  function onSelectGroup(i: number) {
    const grp = groups[i]?.USR_GRP_CD || '';
    setSelectedGroup(grp);
    if (grp) loadRights(grp);
    else setRights([]);
  }

  function toggleCell(i: number, key: 'SER_AUTH'|'SAV_AUTH'|'PRT_AUTH'|'EXL_AUTH', checked: boolean) {
    setRights(prev => { const n = [...prev]; const row = { ...n[i] } as RightRow; (row as any)[key] = checked; row.DIRTY = true; n[i] = row; return n; });
  }

  function toggleColumn(key: 'SER_AUTH'|'SAV_AUTH'|'PRT_AUTH'|'EXL_AUTH', checked: boolean) {
    setRights(prev => prev.map(r => ({ ...r, [key]: checked, DIRTY: true }) as RightRow));
  }

  async function onSave() {
    if (!selectedGroup) { setError('좌측에서 사용자그룹을 선택하세요.'); return; }
    const targets = rights.filter(r => r.DIRTY);
    if (targets.length === 0) { setError('저장할 변경사항이 없습니다.'); return; }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true); setError(null);
    try {
      const payload = targets.map(r => ({
        USR_GRP_CD: selectedGroup,
        MENU_ID: r.MENU_ID,
        SER_AUTH: !!r.SER_AUTH,
        SAV_AUTH: !!r.SAV_AUTH,
        PRT_AUTH: !!r.PRT_AUTH,
        EXL_AUTH: !!r.EXL_AUTH,
      }));
      await http(`/api/m07/mmsm07004/save`, { method: 'POST', body: payload });
      await loadRights(selectedGroup);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onSearchRights() {
    if (!selectedGroup) { setError('좌측에서 사용자그룹을 선택하세요.'); return; }
    loadRights(selectedGroup);
  }

  function onAddUserGroup() {
    // 자리표시자: 사용자그룹 관리 팝업 연동 지점
    alert('사용자그룹 추가 팝업은 추후 연동 예정입니다.');
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">권한 관리</div>

      {/* Filters & Buttons */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">구분</span>
          <input className="h-8 border rounded px-2 w-40" value={pgmType} onChange={e=>setPgmType(e.target.value)} placeholder="예: 메뉴/프로그램" />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">상위 메뉴ID</span>
          <input className="h-8 border rounded px-2 w-40" value={parentMenuId} onChange={e=>setParentMenuId(e.target.value)} placeholder="예: TOP001" />
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={onAddUserGroup} className="h-8 px-3 border rounded">사용자그룹추가</button>
          <button onClick={onSearchRights} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Split: Groups | Rights */}
      <div className="grid grid-cols-12 gap-3">
        {/* Left: User Groups */}
        <div className="col-span-12 md:col-span-3 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">No</th>
                <th className="p-2 text-left">사용자그룹</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => (
                <tr key={g.USR_GRP_CD} className={`border-b hover:bg-muted/30 cursor-pointer ${selectedGroup===g.USR_GRP_CD? 'bg-muted/30': ''}`} onClick={() => onSelectGroup(i)}>
                  <td className="p-2 text-center">{g.SERL ?? i + 1}</td>
                  <td className="p-2 text-left">{g.USR_GRP_NM}</td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={2} className="p-3 text-center text-muted-foreground">그룹이 없습니다. 좌측 상단에서 사용자그룹을 추가하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right: Rights Table */}
        <div className="col-span-12 md:col-span-9 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-32 p-2 text-left">구분</th>
                <th className="p-2 text-left">메뉴명</th>
                <th className="w-24 p-2 text-center">조회 <input type="checkbox" onChange={e => toggleColumn('SER_AUTH', e.target.checked)} /></th>
                <th className="w-24 p-2 text-center">편집 <input type="checkbox" onChange={e => toggleColumn('SAV_AUTH', e.target.checked)} /></th>
                <th className="w-24 p-2 text-center">출력 <input type="checkbox" onChange={e => toggleColumn('PRT_AUTH', e.target.checked)} /></th>
                <th className="w-28 p-2 text-center">EXCEL <input type="checkbox" onChange={e => toggleColumn('EXL_AUTH', e.target.checked)} /></th>
              </tr>
            </thead>
            <tbody>
              {rights.map((r, i) => (
                <tr key={`${r.MENU_ID}`} className="border-b hover:bg-muted/30">
                  <td className="p-2">{r.PGMTP_NM ?? ''}</td>
                  <td className="p-2">{r.MENU_NM ?? ''}</td>
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.SER_AUTH} onChange={e => toggleCell(i, 'SER_AUTH', e.target.checked)} /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.SAV_AUTH} onChange={e => toggleCell(i, 'SAV_AUTH', e.target.checked)} /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.PRT_AUTH} onChange={e => toggleCell(i, 'PRT_AUTH', e.target.checked)} /></td>
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.EXL_AUTH} onChange={e => toggleCell(i, 'EXL_AUTH', e.target.checked)} /></td>
                </tr>
              ))}
              {rights.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-muted-foreground">권한 목록이 없습니다. 그룹과 필터를 설정하고 조회하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
