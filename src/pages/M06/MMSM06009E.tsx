import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 단위 변환 관리 (추정) - MMSM06009E
// 좌: 품목(자재) 목록 | 중간 버튼(추가/삭제) | 우: 선택 품목의 단위/수량 변환 상세 목록
// 상단: 필터(품목명, 자재구분, 품목분류) + 조회/저장/엑셀

// Master(좌) 행
type MasterRow = {
  CHECK?: boolean;
  ITEM_CD?: string;
  ITEM_NM?: string;
  [k: string]: any;
};

// Detail(우) 행 - 품목별 단위/수량 변환 정보
type DetailRow = {
  CHECK?: boolean;
  ISNEW?: boolean;
  ITEM_CD?: string; // 선택된 품목 코드
  ITEM_NM?: string; // 참조용
  QTY?: number | string; // 기본수량
  UNIT_CD?: string; // 기본단위
  CHG_QTY?: number | string; // 변환수량
  CHG_UNIT_CD?: string; // 변환단위
  [k: string]: any;
};

export default function MMSM06009E() {
  // Filters
  const [itemNm, setItemNm] = useState('');
  const [matGb, setMatGb] = useState('');
  const [itemGb, setItemGb] = useState('');

  // Data
  const [masters, setMasters] = useState<MasterRow[]>([]);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ ITEM_CD: string; ITEM_NM: string }>({ ITEM_CD: '', ITEM_NM: '' });

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 초기 자동 조회는 하지 않고, 필요한 경우 활성화
    // onSearch();
  }, []);

  async function fetchMasters() {
    const params = new URLSearchParams();
    if (itemNm) params.set('item_nm', itemNm);
    if (matGb) params.set('mat_gb', matGb);
    if (itemGb) params.set('item_gb', itemGb);
    const url = `/api/m06/mmsm06009/master` + (params.toString() ? `?${params.toString()}` : '');
    const data = await http<MasterRow[]>(url);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }

  async function fetchDetails(itemCd: string) {
    if (!itemCd) return [] as DetailRow[];
    const qs = new URLSearchParams({ item_cd: itemCd }).toString();
    const data = await http<DetailRow[]>(`/api/m06/mmsm06009/detail?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({
      CHECK: false,
      ISNEW: !!r.ISNEW,
      ITEM_CD: r.ITEM_CD ?? itemCd,
      ITEM_NM: r.ITEM_NM ?? selectedItem.ITEM_NM ?? '',
      QTY: r.QTY ?? '',
      UNIT_CD: r.UNIT_CD ?? '',
      CHG_QTY: r.CHG_QTY ?? '',
      CHG_UNIT_CD: r.CHG_UNIT_CD ?? '',
    }));
  }

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const list = await fetchMasters();
      setMasters(list);
      const first = list[0];
      if (first?.ITEM_CD) {
        setSelectedItem({ ITEM_CD: first.ITEM_CD, ITEM_NM: first.ITEM_NM ?? '' });
        const det = await fetchDetails(first.ITEM_CD);
        setDetails(det);
      } else {
        setSelectedItem({ ITEM_CD: '', ITEM_NM: '' });
        setDetails([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function onSelectMaster(i: number) {
    const row = masters[i];
    const itemCd = row?.ITEM_CD || '';
    const itemNm = row?.ITEM_NM || '';
    setSelectedItem({ ITEM_CD: itemCd, ITEM_NM: itemNm });
    setLoading(true); setError(null);
    try {
      const det = await fetchDetails(itemCd);
      setDetails(det);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function toggleMaster(i: number, checked: boolean) {
    setMasters(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }

  function toggleDetail(i: number, checked: boolean) {
    setDetails(prev => { const n = [...prev]; n[i] = { ...n[i], CHECK: checked }; return n; });
  }

  function patchDetail(i: number, patch: Partial<DetailRow>) {
    setDetails(prev => { const n = [...prev]; n[i] = { ...n[i], ...patch, CHECK: true }; return n; });
  }

  function onAddDetail() {
    if (!selectedItem.ITEM_CD) { setError('좌측에서 품목을 선택하세요.'); return; }
    setError(null);
    setDetails(prev => ([
      ...prev,
      { CHECK: true, ISNEW: true, ITEM_CD: selectedItem.ITEM_CD, ITEM_NM: selectedItem.ITEM_NM, QTY: '', UNIT_CD: '', CHG_QTY: '', CHG_UNIT_CD: '' }
    ]));
  }

  async function onDeleteDetail() {
    if (!selectedItem.ITEM_CD) { setError('좌측에서 품목을 선택하세요.'); return; }
    const targets = details.filter(r => r.CHECK && !r.ISNEW).map(r => ({
      ITEM_CD: r.ITEM_CD ?? selectedItem.ITEM_CD,
      UNIT_CD: r.UNIT_CD ?? '',
      CHG_UNIT_CD: r.CHG_UNIT_CD ?? '',
    }));
    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        await http(`/api/m06/mmsm06009/delete`, { method: 'POST', body: targets });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally { setLoading(false); }
    }
    setDetails(prev => prev.filter(r => !r.CHECK));
  }

  async function onSave() {
    if (!selectedItem.ITEM_CD) { setError('좌측에서 품목을 선택하세요.'); return; }
    const targets = details.filter(r => r.CHECK || r.ISNEW);
    if (targets.length === 0) { setError('저장할 대상이 없습니다.'); return; }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true); setError(null);
    try {
      const payload = targets.map(r => ({
        ITEM_CD: r.ITEM_CD ?? selectedItem.ITEM_CD,
        QTY: r.QTY === '' || r.QTY === null || r.QTY === undefined ? null : Number(r.QTY),
        UNIT_CD: r.UNIT_CD ?? '',
        CHG_QTY: r.CHG_QTY === '' || r.CHG_QTY === null || r.CHG_QTY === undefined ? null : Number(r.CHG_QTY),
        CHG_UNIT_CD: r.CHG_UNIT_CD ?? '',
        ISNEW: !!r.ISNEW,
      }));
      await http(`/api/m06/mmsm06009/save`, { method: 'POST', body: { ITEM_CD: selectedItem.ITEM_CD, DETAILS: payload } });
      // 저장 후 재조회
      const det = await fetchDetails(selectedItem.ITEM_CD);
      setDetails(det);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['품목코드','품목명','기본수량','기본단위','변환수량','변환단위'];
    const lines = details.map((r) => [
      selectedItem.ITEM_CD,
      selectedItem.ITEM_NM,
      r.QTY ?? '',
      r.UNIT_CD ?? '',
      r.CHG_QTY ?? '',
      r.CHG_UNIT_CD ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `MMSM06009E_${selectedItem.ITEM_CD || 'details'}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">단위 변환 관리</div>

      {/* Filters & Top Buttons */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">품목명</span>
          <input className="h-8 border rounded px-2 w-48" value={itemNm} onChange={e=>setItemNm(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">자재구분</span>
          <input className="h-8 border rounded px-2 w-36" value={matGb} onChange={e=>setMatGb(e.target.value)} placeholder="예: 원재료 등" />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">품목분류</span>
          <input className="h-8 border rounded px-2 w-36" value={itemGb} onChange={e=>setItemGb(e.target.value)} />
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Layout: Master | Middle Buttons | Detail */}
      <div className="grid grid-cols-12 gap-3">
        {/* Master: Items */}
        <div className="col-span-12 md:col-span-3 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-28 p-2 text-center">자재코드</th>
                <th className="p-2 text-left">자재명</th>
              </tr>
            </thead>
            <tbody>
              {masters.map((r, i) => (
                <tr key={i} className={`border-b hover:bg-muted/30 cursor-pointer ${selectedItem.ITEM_CD===r.ITEM_CD? 'bg-muted/30': ''}`} onClick={() => onSelectMaster(i)}>
                  <td className="p-2 text-center" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleMaster(i, e.target.checked)} /></td>
                  <td className="p-2 text-center">{r.ITEM_CD ?? ''}</td>
                  <td className="p-2 text-left">{r.ITEM_NM ?? ''}</td>
                </tr>
              ))}
              {masters.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-muted-foreground">품목이 없습니다. 조건을 입력하고 조회하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Middle Buttons */}
        <div className="col-span-12 md:col-span-1 flex md:flex-col gap-2 items-center justify-center">
          <button onClick={onDeleteDetail} disabled={loading || !selectedItem.ITEM_CD} className="h-8 px-3 border rounded">삭제</button>
          <button onClick={onAddDetail} disabled={loading || !selectedItem.ITEM_CD} className="h-8 px-3 border rounded">추가</button>
        </div>

        {/* Detail: Unit Conversion */}
        <div className="col-span-12 md:col-span-8 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-28 p-2 text-center">품목코드</th>
                <th className="w-40 p-2 text-left">품목명</th>
                <th className="w-28 p-2 text-right">기본수량</th>
                <th className="w-28 p-2 text-left">기본단위</th>
                <th className="w-28 p-2 text-right">변환수량</th>
                <th className="w-28 p-2 text-left">변환단위</th>
              </tr>
            </thead>
            <tbody>
              {details.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleDetail(i, e.target.checked)} /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={selectedItem.ITEM_CD} readOnly /></td>
                  <td className="p-1"><input className="h-8 border rounded px-2 w-full bg-muted" value={selectedItem.ITEM_NM} readOnly /></td>
                  <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.QTY ?? ''} onChange={e => patchDetail(i, { QTY: e.target.value.replace(/[^0-9.\-]/g,'') })} /></td>
                  <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.UNIT_CD ?? ''} onChange={e => patchDetail(i, { UNIT_CD: e.target.value })} /></td>
                  <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.CHG_QTY ?? ''} onChange={e => patchDetail(i, { CHG_QTY: e.target.value.replace(/[^0-9.\-]/g,'') })} /></td>
                  <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.CHG_UNIT_CD ?? ''} onChange={e => patchDetail(i, { CHG_UNIT_CD: e.target.value })} /></td>
                </tr>
              ))}
              {details.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-muted-foreground">상세가 없습니다. 좌측에서 품목을 선택 후 추가하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
