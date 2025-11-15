import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 제품 마스터 (MMSM06003E)
// 좌측: 제품 목록(선택/추가/삭제/엑셀) | 우측: 선택 제품 상세(종이/판지 속성) 편집
// 상단: 제품명 필터 + 조회/저장

type AnyRow = Record<string, any>;

type MasterRow = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SERL?: number | string;
  ITEM_CD?: string;
  ITEM_NM?: string;
  PRT_CNT?: number | string; // 도수
  [k: string]: any;
};

type Detail = {
  // paper section
  cd1?: string; // hidden
  ITEM_TP1?: string; // 종류
  PROC_CD1?: string; // 투입위치(공정)
  WID1?: string; // 가로
  HGT1?: string; // 세로
  QTY1?: string; // 절수
  // cardboard section
  cd2?: string; // hidden
  ITEM_TP2?: string; // 종류
  PROC_CD2?: string; // 투입위치(공정)
  WID2?: string; // 가로
  HGT2?: string; // 세로
  QTY2?: string; // 절수
  [k: string]: any;
};

export default function MMSM06003E() {
  // Filter
  const [itemNmFilter, setItemNmFilter] = useState('');

  // Data
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [detail, setDetail] = useState<Detail | null>(null);

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple pickers for ITEM_TP1/2 (placeholder for real popup)
  const [pickerOpen, setPickerOpen] = useState<null | 'tp1' | 'tp2'>(null);
  const [pickerVal, setPickerVal] = useState('');

  async function fetchMaster() {
    const qs = new URLSearchParams({ item_nm: itemNmFilter || '' }).toString();
    const data = await http<AnyRow[]>(`/api/m06/mmsm06003/list?${qs}`);
    return (Array.isArray(data) ? data : []).map((r, i) => ({
      CHECK: false,
      ISNEW: !!r.ISNEW,
      SERL: r.SERL ?? i + 1,
      ITEM_CD: r.ITEM_CD ?? '',
      ITEM_NM: r.ITEM_NM ?? '',
      PRT_CNT: r.PRT_CNT ?? '',
    } as MasterRow));
  }

  async function fetchDetail(itemCd?: string) {
    if (!itemCd) return null;
    const qs = new URLSearchParams({ item_cd: itemCd }).toString();
    const data = await http<AnyRow>(`/api/m06/mmsm06003/detail?${qs}`);
    if (!data || typeof data !== 'object') return {
      cd1: '', ITEM_TP1: '', PROC_CD1: '', WID1: '', HGT1: '', QTY1: '',
      cd2: '', ITEM_TP2: '', PROC_CD2: '', WID2: '', HGT2: '', QTY2: '',
    } as Detail;
    return {
      cd1: data.cd1 ?? '', ITEM_TP1: data.ITEM_TP1 ?? '', PROC_CD1: data.PROC_CD1 ?? '', WID1: data.WID1 ?? '', HGT1: data.HGT1 ?? '', QTY1: data.QTY1 ?? '',
      cd2: data.cd2 ?? '', ITEM_TP2: data.ITEM_TP2 ?? '', PROC_CD2: data.PROC_CD2 ?? '', WID2: data.WID2 ?? '', HGT2: data.HGT2 ?? '', QTY2: data.QTY2 ?? '',
    } as Detail;
  }

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const m = await fetchMaster();
      setMaster(m);
      const firstIdx = m.length > 0 ? 0 : -1;
      setSelectedIndex(firstIdx);
      const d = await fetchDetail(m[firstIdx]?.ITEM_CD);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function onSelectRow(i: number) {
    setSelectedIndex(i);
    setLoading(true); setError(null);
    try {
      const d = await fetchDetail(master[i]?.ITEM_CD);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function toggleRow(i: number, checked: boolean) {
    setMaster(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }
  function patchRow(i: number, patch: Partial<MasterRow>) {
    setMaster(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch, CHECK: true }; return next; });
  }

  function onAdd() {
    setMaster(prev => ([
      ...prev,
      { CHECK: true, ISNEW: true, SERL: (prev.length + 1), ITEM_CD: '', ITEM_NM: '', PRT_CNT: '' }
    ]));
    setSelectedIndex(prev => (prev >= 0 ? prev : 0));
  }

  async function onDelete() {
    const targets = master.filter(r => r.CHECK && !r.ISNEW).map(r => r.ITEM_CD).filter(Boolean) as string[];
    setError(null);
    if (targets.length > 0) {
      setLoading(true);
      try {
        await http(`/api/m06/mmsm06003/delete`, { method: 'POST', body: targets.map(cd => ({ ITEM_CD: cd })) });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally { setLoading(false); }
    }
    setMaster(prev => prev.filter(r => !r.CHECK));
    setDetail(null); setSelectedIndex(-1);
  }

  async function onSave() {
    const checked = master.filter(r => r.CHECK || r.ISNEW);
    if (checked.length === 0 && !detail) { setError('저장할 대상이 없습니다.'); return; }
    if (!window.confirm('저장 하시겠습니까?')) return;

    setLoading(true); setError(null);
    try {
      const payload: AnyRow = {
        masters: checked.map(r => ({
          ISNEW: !!r.ISNEW,
          ITEM_CD: r.ITEM_CD ?? '',
          ITEM_NM: r.ITEM_NM ?? '',
          PRT_CNT: r.PRT_CNT ?? '',
        })),
        detail: selectedIndex >= 0 && master[selectedIndex]?.ITEM_CD ? {
          ITEM_CD: master[selectedIndex].ITEM_CD,
          ...(detail || {})
        } : null,
      };
      await http(`/api/m06/mmsm06003/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['No.','제품코드','제품명','도수'];
    const lines = master.map((r, i) => [
      r.SERL ?? i + 1,
      r.ITEM_CD ?? '',
      r.ITEM_NM ?? '',
      r.PRT_CNT ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM06003E_master.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function patchDetail(patch: Partial<Detail>) {
    setDetail(prev => ({ ...(prev ?? {}), ...patch }));
  }

  function openPicker(which: 'tp1' | 'tp2') {
    setPickerVal(''); setPickerOpen(which);
  }
  function applyPicker() {
    if (pickerOpen === 'tp1') patchDetail({ ITEM_TP1: pickerVal });
    if (pickerOpen === 'tp2') patchDetail({ ITEM_TP2: pickerVal });
    setPickerOpen(null);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">제품 마스터</div>

      {/* Filters & Buttons */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">제품명</span>
          <input className="h-8 border rounded px-2 w-60" value={itemNmFilter} onChange={e=>setItemNmFilter(e.target.value)} />
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

      {/* Layout: List | Detail */}
      <div className="grid grid-cols-12 gap-3">
        {/* List */}
        <div className="col-span-12 md:col-span-4 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-12 p-2 text-center">No.</th>
                <th className="w-24 p-2 text-center">제품코드</th>
                <th className="p-2 text-left">제품명</th>
                <th className="w-16 p-2 text-center">도수</th>
              </tr>
            </thead>
            <tbody>
              {master.map((r, i) => (
                <tr key={i} className={`border-b hover:bg-muted/30 ${selectedIndex===i? 'bg-muted/30': ''}`} onClick={() => onSelectRow(i)}>
                  <td className="p-2 text-center" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleRow(i, e.target.checked)} /></td>
                  <td className="p-2 text-center">{r.SERL ?? i + 1}</td>
                  <td className="p-1 text-center" onClick={e=>e.stopPropagation()}>
                    <input className={`h-8 border rounded px-2 w-full ${r.ISNEW ? '' : 'bg-muted'}`} value={r.ITEM_CD ?? ''} readOnly={!r.ISNEW} onChange={e => patchRow(i, { ITEM_CD: e.target.value })} />
                  </td>
                  <td className="p-1" onClick={e=>e.stopPropagation()}>
                    <input className="h-8 border rounded px-2 w-full" value={r.ITEM_NM ?? ''} onChange={e => patchRow(i, { ITEM_NM: e.target.value })} />
                  </td>
                  <td className="p-1 text-center" onClick={e=>e.stopPropagation()}>
                    <input className="h-8 border rounded px-2 w-full text-center" value={r.PRT_CNT ?? ''} onChange={e => patchRow(i, { PRT_CNT: e.target.value })} />
                  </td>
                </tr>
              ))}
              {master.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">목록이 없습니다. 조건을 입력하고 조회하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail */}
        <div className="col-span-12 md:col-span-8 border rounded p-2 space-y-3">
          {!detail && (
            <div className="text-sm text-muted-foreground">좌측에서 제품을 선택하면 상세가 표시됩니다.</div>
          )}
          {detail && (
            <>
              <div className="grid grid-cols-2 gap-6">
                {/* Paper */}
                <div className="space-y-2">
                  <div className="font-semibold">종이</div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="text-sm text-muted-foreground">종류</div>
                    <div className="flex gap-1">
                      <input className="h-8 border rounded px-2 w-full" value={detail.ITEM_TP1 ?? ''} readOnly />
                      <button className="h-8 px-2 border rounded" onClick={() => openPicker('tp1')}>...</button>
                    </div>
                    <div className="text-sm text-muted-foreground">투입위치</div>
                    <input className="h-8 border rounded px-2" value={detail.PROC_CD1 ?? ''} onChange={e => patchDetail({ PROC_CD1: e.target.value })} />
                    <div className="text-sm text-muted-foreground">가로</div>
                    <input className="h-8 border rounded px-2" value={detail.WID1 ?? ''} onChange={e => patchDetail({ WID1: e.target.value })} />
                    <div className="text-sm text-muted-foreground">세로</div>
                    <input className="h-8 border rounded px-2" value={detail.HGT1 ?? ''} onChange={e => patchDetail({ HGT1: e.target.value })} />
                    <div className="text-sm text-muted-foreground">절수</div>
                    <input className="h-8 border rounded px-2" value={detail.QTY1 ?? ''} onChange={e => patchDetail({ QTY1: e.target.value })} />
                  </div>
                </div>
                {/* Cardboard */}
                <div className="space-y-2">
                  <div className="font-semibold">판지</div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div className="text-sm text-muted-foreground">종류</div>
                    <div className="flex gap-1">
                      <input className="h-8 border rounded px-2 w-full" value={detail.ITEM_TP2 ?? ''} readOnly />
                      <button className="h-8 px-2 border rounded" onClick={() => openPicker('tp2')}>...</button>
                    </div>
                    <div className="text-sm text-muted-foreground">투입위치</div>
                    <input className="h-8 border rounded px-2" value={detail.PROC_CD2 ?? ''} onChange={e => patchDetail({ PROC_CD2: e.target.value })} />
                    <div className="text-sm text-muted-foreground">가로</div>
                    <input className="h-8 border rounded px-2" value={detail.WID2 ?? ''} onChange={e => patchDetail({ WID2: e.target.value })} />
                    <div className="text-sm text-muted-foreground">세로</div>
                    <input className="h-8 border rounded px-2" value={detail.HGT2 ?? ''} onChange={e => patchDetail({ HGT2: e.target.value })} />
                    <div className="text-sm text-muted-foreground">절수</div>
                    <input className="h-8 border rounded px-2" value={detail.QTY2 ?? ''} onChange={e => patchDetail({ QTY2: e.target.value })} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 간단 타입 선택 모달 */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-background border rounded p-3 w-[360px] space-y-2 shadow-lg">
            <div className="font-semibold">{pickerOpen === 'tp1' ? '종이 종류 선택' : '판지 종류 선택'}</div>
            <input className="h-8 border rounded px-2 w-full" value={pickerVal} onChange={(e) => setPickerVal(e.target.value)} placeholder="종류를 입력하세요" />
            <div className="flex justify-end gap-2 pt-1">
              <button className="h-8 px-3 border rounded" onClick={() => setPickerOpen(null)}>취소</button>
              <button className="h-8 px-3 border rounded bg-primary text-primary-foreground" onClick={applyPicker}>선택</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
