import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 원자재 거래처 관리 (MMSM01010E)
// 필터: 거래처(코드/명 선택), 제품코드, 제품명
// 레이아웃: 좌(마스터 선택) - 중간(추가/삭제) - 우(디테일 편집: MAIN_YN)

type MasterRow = {
  CHECK?: boolean;
  ITEM_CD?: string;
  ITEM_NM?: string;
};

type DetailRow = {
  ISNEW?: boolean;
  CHECK?: boolean;
  ITEM_CD?: string;
  ITEM_NM?: string;
  MAIN_YN?: 'Y' | 'N' | '';
};

export default function MMSM01010E() {
  // Filters
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');
  const [itemCd, setItemCd] = useState('');
  const [itemNm, setItemNm] = useState('');

  // Data
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [detail, setDetail] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 고객 선택 간단 모달
  const [custOpen, setCustOpen] = useState(false);
  const [tmpCode, setTmpCode] = useState('');
  const [tmpName, setTmpName] = useState('');

  function openCustomerPicker() {
    setTmpCode(cstCd);
    setTmpName(cstNm);
    setCustOpen(true);
  }
  function applyCustomer() {
    setCstCd(tmpCode.trim());
    setCstNm(tmpName.trim());
    setCustOpen(false);
  }

  useEffect(() => {
    void onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMaster() {
    const qs = new URLSearchParams({
      cst_cd: cstCd || '',
      item_cd: itemCd || '',
      item_nm: itemNm || '',
    }).toString();
    const data = await http<MasterRow[]>(`/api/m01/mmsm01010/master?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }

  async function loadDetail() {
    const qs = new URLSearchParams({
      cst_cd: cstCd || '',
      item_cd: itemCd || '',
      item_nm: itemNm || '',
    }).toString();
    const data = await http<DetailRow[]>(`/api/m01/mmsm01010/detail?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({
      ISNEW: false,
      CHECK: false,
      ITEM_CD: r.ITEM_CD ?? '',
      ITEM_NM: r.ITEM_NM ?? '',
      MAIN_YN: (r.MAIN_YN as any) ?? '',
    }));
  }

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const [m, d] = await Promise.all([loadMaster(), loadDetail()]);
      setMaster(m);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function toggleMaster(i: number, checked: boolean) {
    setMaster(prev => {
      const next = [...prev];
      next[i] = { ...next[i], CHECK: checked };
      return next;
    });
  }

  function toggleDetail(i: number, checked: boolean) {
    setDetail(prev => {
      const next = [...prev];
      next[i] = { ...next[i], CHECK: checked };
      return next;
    });
  }

  function onDetailChange(i: number, patch: Partial<DetailRow>) {
    setDetail(prev => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch, CHECK: true };
      return next;
    });
  }

  function onAddFromMaster() {
    if (!cstCd) {
      setError('거래처를 선택하세요.');
      return;
    }
    const selected = master.filter(r => r.CHECK);
    if (selected.length === 0) return;
    setDetail(prev => {
      const list: DetailRow[] = [];
      selected.forEach((m) => {
        list.push({
          ISNEW: true,
          CHECK: true,
          ITEM_CD: m.ITEM_CD ?? '',
          ITEM_NM: m.ITEM_NM ?? '',
          MAIN_YN: '',
        });
      });
      return [...list, ...prev];
    });
  }

  function onDeleteDetail() {
    setDetail(prev => prev.filter(r => !r.CHECK));
  }

  async function onSave() {
    if (!cstCd) {
      setError('거래처를 선택하세요.');
      return;
    }
    const targets = detail.filter(r => r.CHECK);
    if (targets.length === 0) {
      setError('저장할 데이터가 없습니다.');
      return;
    }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      const payload = targets.map(r => ({
        METHOD: 'Y' as const,
        CST_CD: cstCd,
        ITEM_CD: r.ITEM_CD ?? '',
        MAIN_YN: r.MAIN_YN ?? '',
      }));
      await http(`/api/m01/mmsm01010/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const headers = ['품목코드','품목명','MAIN_YN'];
    const lines = detail.map((r) => [
      r.ITEM_CD ?? '',
      r.ITEM_NM ?? '',
      r.MAIN_YN ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}` + `"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MMSM01010E_${cstCd || 'vendor'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">원자재 거래처 관리</div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <label className="flex flex-col text-sm md:col-span-2">
          <span className="mb-1">거래처</span>
          <div className="flex gap-1">
            <input value={cstCd} readOnly className="h-8 border rounded px-2 w-28 bg-muted" placeholder="코드" />
            <input value={cstNm} readOnly className="h-8 border rounded px-2 flex-1 bg-muted" placeholder="거래처 선택" />
            <button type="button" className="h-8 px-2 border rounded" onClick={openCustomerPicker}>...</button>
          </div>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">제품코드</span>
          <input className="h-8 border rounded px-2" value={itemCd} onChange={(e) => setItemCd(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">제품명</span>
          <input className="h-8 border rounded px-2" value={itemNm} onChange={(e) => setItemNm(e.target.value)} />
        </label>
        <div className="flex gap-2 md:col-span-4 justify-end">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Split: Master | Buttons | Detail */}
      <div className="grid grid-cols-12 gap-3">
        {/* Master 45% */}
        <div className="col-span-12 md:col-span-5 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-28 p-2 text-center">품목코드</th>
                <th className="p-2 text-center">품목명</th>
              </tr>
            </thead>
            <tbody>
              {master.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleMaster(i, e.target.checked)} /></td>
                  <td className="p-2 text-center">{r.ITEM_CD ?? ''}</td>
                  <td className="p-2 text-left">{r.ITEM_NM ?? ''}</td>
                </tr>
              ))}
              {master.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-muted-foreground">마스터 데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Middle buttons 5% */}
        <div className="col-span-12 md:col-span-2 flex md:flex-col gap-2 items-center justify-center">
          <button onClick={onDeleteDetail} className="h-8 px-3 border rounded">삭제</button>
          <button onClick={onAddFromMaster} className="h-8 px-3 border rounded">추가</button>
        </div>

        {/* Detail 50% */}
        <div className="col-span-12 md:col-span-5 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">신규</th>
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-28 p-2 text-center">품목코드</th>
                <th className="p-2 text-center">품목명</th>
                <th className="w-20 p-2 text-center">MainYN</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-center">{r.ISNEW ? 'Y' : ''}</td>
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleDetail(i, e.target.checked)} /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_CD || ''} readOnly /></td>
                  <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_NM || ''} readOnly /></td>
                  <td className="p-1 text-center">
                    <select className="h-8 border rounded px-2 w-full" value={r.MAIN_YN || ''} onChange={e => onDetailChange(i, { MAIN_YN: e.target.value as any })}>
                      <option value=""></option>
                      <option value="Y">Y</option>
                      <option value="N">N</option>
                    </select>
                  </td>
                </tr>
              ))}
              {detail.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">디테일 데이터가 없습니다. 마스터에서 선택 후 추가하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 고객 선택 모달 */}
      {custOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-background border rounded p-3 w-[460px] space-y-2 shadow-lg">
            <div className="font-semibold">거래처 선택</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col text-sm">
                <span className="mb-1">코드</span>
                <input className="h-8 border rounded px-2" value={tmpCode} onChange={(e) => setTmpCode(e.target.value)} />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1">이름</span>
                <input className="h-8 border rounded px-2" value={tmpName} onChange={(e) => setTmpName(e.target.value)} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button className="h-8 px-3 border rounded" onClick={() => setCustOpen(false)}>취소</button>
              <button className="h-8 px-3 border rounded bg-primary text-primary-foreground" onClick={applyCustomer}>선택</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
