import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 기초코드 관리 (MMSM06001E)
// 좌: 그룹 마스터 | 우: 그룹별 기초코드 상세
// 상단: 그룹코드/그룹명 필터 + 조회
// 좌/우 각각: 추가, 저장(체크 또는 신규), 삭제

type Row = Record<string, any>;

type MasterRow = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SERL?: number | string;
  BSC_GRP_CD?: string;
  BSC_GRP_NM?: string;
  USE_YN?: string; // 'Y' | 'N'
  MOD_USR?: string;
  MOD_DT?: string;
  [k: string]: any;
};

type DetailRow = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SERL?: number | string;
  DSP_SEQ?: number | string;
  BSC_CD?: string;
  BSC_NM?: string;
  BSC_NM2?: string;
  DESC?: string;
  USE_YN?: string; // 'Y' | 'N'
  MOD_USR?: string;
  MOD_DT?: string;
  [k: string]: any;
};

export default function MMSM06001E() {
  // Filters
  const [grpCd, setGrpCd] = useState('');
  const [grpNm, setGrpNm] = useState('');

  // Data
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [detail, setDetail] = useState<DetailRow[]>([]);
  const [selectedGrp, setSelectedGrp] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 최초 로드 시 조회 X, 사용자가 조건으로 조회
  useEffect(() => {
    // no-op
  }, []);

  async function fetchMaster() {
    const qs = new URLSearchParams({ grp_cd: grpCd || '', grp_nm: grpNm || '' }).toString();
    const data = await http<MasterRow[]>(`/api/m06/mmsm06001/master?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false, ISNEW: !!r.ISNEW }));
  }
  async function fetchDetail(grp: string) {
    if (!grp) return [] as DetailRow[];
    const qs = new URLSearchParams({ grp_cd: grp }).toString();
    const data = await http<DetailRow[]>(`/api/m06/mmsm06001/detail?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false, ISNEW: !!r.ISNEW }));
  }

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const m = await fetchMaster();
      setMaster(m);
      // 선택 그룹 유지/재설정
      const nextGrp = m.find(x => x.BSC_GRP_CD)?.BSC_GRP_CD || '';
      setSelectedGrp(nextGrp);
      const d = await fetchDetail(nextGrp);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function onSelectMaster(i: number) {
    const grp = master[i]?.BSC_GRP_CD || '';
    setSelectedGrp(grp);
    setLoading(true); setError(null);
    try {
      const d = await fetchDetail(grp);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  // Master handlers
  function toggleMaster(i: number, checked: boolean) {
    setMaster(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }
  function patchMaster(i: number, patch: Partial<MasterRow>) {
    setMaster(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch, CHECK: true }; return next; });
  }
  function onMasterAdd() {
    setMaster(prev => ([
      ...prev,
      { CHECK: true, ISNEW: true, SERL: '', BSC_GRP_CD: '', BSC_GRP_NM: '', USE_YN: 'Y' }
    ]));
  }
  async function onMasterDelete() {
    const targets = master.filter(r => r.CHECK && !r.ISNEW).map(r => r.BSC_GRP_CD).filter(Boolean) as string[];
    const hasNewOnly = master.every(r => r.ISNEW ? r.CHECK ? true : true : true) && targets.length === 0;
    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        await http(`/api/m06/mmsm06001/master/delete`, { method: 'POST', body: targets.map(cd => ({ BSC_GRP_CD: cd })) });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    // UI에서 제거 (신규 포함)
    setMaster(prev => prev.filter(r => !r.CHECK));
    // 현재 선택그룹이 삭제되면 디테일 초기화
    setTimeout(() => {
      if (!master.some(r => r.BSC_GRP_CD === selectedGrp)) {
        setSelectedGrp(''); setDetail([]);
      }
    }, 0);
    if (!hasNewOnly) {
      // 서버 반영 후 재조회 권장
      onSearch();
    }
  }
  async function onMasterSave() {
    const targets = master.filter(r => r.CHECK || r.ISNEW);
    if (targets.length === 0) { setError('저장할 마스터 대상이 없습니다.'); return; }
    if (!window.confirm('마스터를 저장하시겠습니까?')) return;
    setLoading(true); setError(null);
    try {
      const payload = targets.map(r => ({
        BSC_GRP_CD: r.BSC_GRP_CD ?? '',
        BSC_GRP_NM: r.BSC_GRP_NM ?? '',
        USE_YN: r.USE_YN ?? 'Y',
        ISNEW: !!r.ISNEW,
      }));
      await http(`/api/m06/mmsm06001/master/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  // Detail handlers
  function toggleDetail(i: number, checked: boolean) {
    setDetail(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }
  function patchDetail(i: number, patch: Partial<DetailRow>) {
    setDetail(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch, CHECK: true }; return next; });
  }
  function onDetailAdd() {
    if (!selectedGrp) { setError('좌측에서 그룹을 먼저 선택하세요.'); return; }
    setDetail(prev => ([...prev, { CHECK: true, ISNEW: true, SERL: '', DSP_SEQ: '', BSC_CD: '', BSC_NM: '', BSC_NM2: '', DESC: '', USE_YN: 'Y' }]));
  }
  async function onDetailDelete() {
    if (!selectedGrp) { setError('그룹을 먼저 선택하세요.'); return; }
    const targets = detail.filter(r => r.CHECK && !r.ISNEW).map(r => r.BSC_CD).filter(Boolean) as string[];
    const hasNewOnly = detail.every(r => r.ISNEW ? r.CHECK ? true : true : true) && targets.length === 0;
    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        await http(`/api/m06/mmsm06001/detail/delete`, { method: 'POST', body: targets.map(cd => ({ BSC_GRP_CD: selectedGrp, BSC_CD: cd })) });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    setDetail(prev => prev.filter(r => !r.CHECK));
    if (!hasNewOnly) {
      onSelectMaster(master.findIndex(m => m.BSC_GRP_CD === selectedGrp));
    }
  }
  async function onDetailSave() {
    if (!selectedGrp) { setError('그룹을 먼저 선택하세요.'); return; }
    const targets = detail.filter(r => r.CHECK || r.ISNEW);
    if (targets.length === 0) { setError('저장할 상세 대상이 없습니다.'); return; }
    if (!window.confirm('상세를 저장하시겠습니까?')) return;
    setLoading(true); setError(null);
    try {
      const payload = targets.map(r => ({
        BSC_GRP_CD: selectedGrp,
        DSP_SEQ: r.DSP_SEQ ?? '',
        BSC_CD: r.BSC_CD ?? '',
        BSC_NM: r.BSC_NM ?? '',
        BSC_NM2: r.BSC_NM2 ?? '',
        DESC: r.DESC ?? '',
        USE_YN: r.USE_YN ?? 'Y',
        ISNEW: !!r.ISNEW,
      }));
      await http(`/api/m06/mmsm06001/detail/save`, { method: 'POST', body: payload });
      const d = await fetchDetail(selectedGrp); setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">기초코드 관리</div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">그룹코드</span>
          <input className="h-8 border rounded px-2 w-40" value={grpCd} onChange={e=>setGrpCd(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">그룹명</span>
          <input className="h-8 border rounded px-2 w-60" value={grpNm} onChange={e=>setGrpNm(e.target.value)} />
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Layout: Master | Detail */}
      <div className="grid grid-cols-12 gap-3">
        {/* Master Panel */}
        <div className="col-span-12 md:col-span-6 space-y-2">
          <div className="flex justify-end gap-2">
            <button onClick={onMasterAdd} disabled={loading} className="h-8 px-3 border rounded">추가</button>
            <button onClick={onMasterSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
            <button onClick={onMasterDelete} disabled={loading} className="h-8 px-3 border rounded">삭제</button>
          </div>
          <div className="border rounded overflow-auto max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="w-12 p-2 text-center">선택</th>
                  <th className="w-12 p-2 text-center">No.</th>
                  <th className="w-28 p-2 text-center">그룹코드</th>
                  <th className="p-2 text-left">그룹코드명</th>
                  <th className="w-20 p-2 text-center">사용여부</th>
                  <th className="w-20 p-2 text-center">작성자</th>
                  <th className="w-28 p-2 text-center">작성일자</th>
                </tr>
              </thead>
              <tbody>
                {master.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => onSelectMaster(i)}>
                    <td className="p-2 text-center" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleMaster(i, e.target.checked)} /></td>
                    <td className="p-2 text-center">{r.SERL ?? i + 1}</td>
                    <td className="p-1 text-center" onClick={e=>e.stopPropagation()}>
                      <input className={`h-8 border rounded px-2 w-full ${r.ISNEW ? '' : 'bg-muted'}`} value={r.BSC_GRP_CD ?? ''} readOnly={!r.ISNEW} onChange={e => patchMaster(i, { BSC_GRP_CD: e.target.value })} />
                    </td>
                    <td className="p-1" onClick={e=>e.stopPropagation()}>
                      <input className="h-8 border rounded px-2 w-full" value={r.BSC_GRP_NM ?? ''} onChange={e => patchMaster(i, { BSC_GRP_NM: e.target.value })} />
                    </td>
                    <td className="p-1 text-center" onClick={e=>e.stopPropagation()}>
                      <select className="h-8 border rounded px-2 w-full" value={r.USE_YN ?? 'Y'} onChange={e => patchMaster(i, { USE_YN: e.target.value })}>
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    <td className="p-2 text-center">{r.MOD_USR ?? ''}</td>
                    <td className="p-2 text-center">{r.MOD_DT ?? ''}</td>
                  </tr>
                ))}
                {master.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-3 text-center text-muted-foreground">그룹 목록이 없습니다. 조건을 입력하고 조회하세요.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="col-span-12 md:col-span-6 space-y-2">
          <div className="flex justify-end gap-2">
            <button onClick={onDetailAdd} disabled={loading || !selectedGrp} className="h-8 px-3 border rounded">추가</button>
            <button onClick={onDetailSave} disabled={loading || !selectedGrp} className="h-8 px-3 border rounded">저장</button>
            <button onClick={onDetailDelete} disabled={loading || !selectedGrp} className="h-8 px-3 border rounded">삭제</button>
          </div>
          <div className="border rounded overflow-auto max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="w-12 p-2 text-center">선택</th>
                  <th className="w-12 p-2 text-center">No.</th>
                  <th className="w-16 p-2 text-center">표시순서</th>
                  <th className="w-24 p-2 text-center">기초코드</th>
                  <th className="p-2 text-left">기초코드명</th>
                  <th className="w-28 p-2 text-left">기초코드명약어</th>
                  <th className="w-40 p-2 text-left">설명</th>
                  <th className="w-20 p-2 text-center">사용여부</th>
                  <th className="w-20 p-2 text-center">작성자</th>
                  <th className="w-28 p-2 text-center">작성일자</th>
                </tr>
              </thead>
              <tbody>
                {detail.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleDetail(i, e.target.checked)} /></td>
                    <td className="p-2 text-center">{r.SERL ?? i + 1}</td>
                    <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full text-center" value={r.DSP_SEQ ?? ''} onChange={e => patchDetail(i, { DSP_SEQ: e.target.value })} /></td>
                    <td className="p-1 text-center"><input className={`h-8 border rounded px-2 w-full ${r.ISNEW ? '' : 'bg-muted'}`} value={r.BSC_CD ?? ''} readOnly={!r.ISNEW} onChange={e => patchDetail(i, { BSC_CD: e.target.value })} /></td>
                    <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.BSC_NM ?? ''} onChange={e => patchDetail(i, { BSC_NM: e.target.value })} /></td>
                    <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.BSC_NM2 ?? ''} onChange={e => patchDetail(i, { BSC_NM2: e.target.value })} /></td>
                    <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.DESC ?? ''} onChange={e => patchDetail(i, { DESC: e.target.value })} /></td>
                    <td className="p-1 text-center">
                      <select className="h-8 border rounded px-2 w-full" value={r.USE_YN ?? 'Y'} onChange={e => patchDetail(i, { USE_YN: e.target.value })}>
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    <td className="p-2 text-center">{r.MOD_USR ?? ''}</td>
                    <td className="p-2 text-center">{r.MOD_DT ?? ''}</td>
                  </tr>
                ))}
                {detail.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-3 text-center text-muted-foreground">상세 목록이 없습니다. 좌측 그룹을 선택하고 추가 또는 조회하세요.</td>
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
