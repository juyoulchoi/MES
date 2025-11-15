import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 제품거래처 관리 (MMSM04005E)
// 필터: 거래처(코드/명) 선택, 제품코드, 제품명
// 본문: 좌측 전체 제품 목록, 가운데 추가/삭제, 우측 거래처별 제품 목록
// 버튼: 조회(마스터/디테일 갱신), 엑셀(거래처별 제품 CSV)

 type Row = Record<string, any>;

export default function MMSM04005E() {
  // Filters
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');
  const [itemCd, setItemCd] = useState('');
  const [itemNm, setItemNm] = useState('');

  // Data
  const [master, setMaster] = useState<Row[]>([]); // 전체 제품 목록(필터 기준)
  const [detail, setDetail] = useState<Row[]>([]); // 거래처별 제품 목록
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 고객 선택 모달(간단)
  const [custOpen, setCustOpen] = useState(false);
  const [tmpCd, setTmpCd] = useState('');
  const [tmpNm, setTmpNm] = useState('');

  // 고객 선택 후 자동 조회
  useEffect(() => {
    if (cstCd) {
      onSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cstCd]);

  async function fetchMaster() {
    const qs = new URLSearchParams({ item_cd: itemCd || '', item_nm: itemNm || '' }).toString();
    const data = await http<Row[]>(`/api/m04/mmsm04005/master?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }

  async function fetchDetail() {
    if (!cstCd) return [] as Row[];
    const qs = new URLSearchParams({ cst_cd: cstCd }).toString();
    const data = await http<Row[]>(`/api/m04/mmsm04005/detail?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const [m, d] = await Promise.all([fetchMaster(), fetchDetail()]);
      setMaster(m);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function toggleMaster(i: number, checked: boolean) {
    setMaster(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }
  function toggleDetail(i: number, checked: boolean) {
    setDetail(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }

  async function onAdd() {
    if (!cstCd) { setError('거래처를 먼저 선택하세요.'); return; }
    const targets = master.filter(r => r.CHECK).map(r => r.ITEM_CD).filter(Boolean);
    if (targets.length === 0) { setError('추가할 제품을 선택하세요.'); return; }
    setLoading(true); setError(null);
    try {
      const payload = targets.map((cd: string) => ({ CST_CD: cstCd, ITEM_CD: cd }));
      await http(`/api/m04/mmsm04005/add`, { method: 'POST', body: payload });
      const d = await fetchDetail(); setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function onDelete() {
    if (!cstCd) { setError('거래처를 먼저 선택하세요.'); return; }
    const targets = detail.filter(r => r.CHECK).map(r => r.ITEM_CD).filter(Boolean);
    if (targets.length === 0) { setError('삭제할 제품을 선택하세요.'); return; }
    setLoading(true); setError(null);
    try {
      const payload = targets.map((cd: string) => ({ CST_CD: cstCd, ITEM_CD: cd }));
      await http(`/api/m04/mmsm04005/delete`, { method: 'POST', body: payload });
      const d = await fetchDetail(); setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['순번','품목코드','품목명','거래처코드','거래처명'];
    const lines = detail.map((r, i) => [
      i + 1,
      r.ITEM_CD ?? '',
      r.ITEM_NM ?? '',
      cstCd,
      cstNm,
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM04005E_detail.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function openCustomerPicker() { setTmpCd(cstCd); setTmpNm(cstNm); setCustOpen(true); }
  function applyCustomer() { setCstCd(tmpCd.trim()); setCstNm(tmpNm.trim()); setCustOpen(false); }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">제품거래처 관리</div>

      {/* Filters & Top Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <label className="flex flex-col text-sm md:col-span-2">
          <span className="mb-1">거래처명</span>
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
        <div className="flex gap-2 justify-end">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Layout: Master | Buttons | Detail */}
      <div className="grid grid-cols-12 gap-3">
        {/* Master */}
        <div className="col-span-12 md:col-span-5 border rounded overflow-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-28 p-2 text-center">품목코드</th>
                <th className="p-2 text-left">품목명</th>
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
                  <td colSpan={3} className="p-3 text-center text-muted-foreground">제품 목록이 없습니다. 조건을 입력하고 조회하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Middle Buttons */}
        <div className="col-span-12 md:col-span-1 flex md:flex-col gap-2 items-center justify-center">
          <button onClick={onDelete} disabled={loading || !cstCd} className="h-8 px-3 border rounded">삭제</button>
          <button onClick={onAdd} disabled={loading || !cstCd} className="h-8 px-3 border rounded">추가</button>
        </div>

        {/* Detail */}
        <div className="col-span-12 md:col-span-6 border rounded overflow-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-28 p-2 text-center">품목코드</th>
                <th className="p-2 text-left">품목명</th>
                <th className="w-28 p-2 text-center">거래처코드</th>
                <th className="p-2 text-left">거래처명</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleDetail(i, e.target.checked)} /></td>
                  <td className="p-2 text-center">{r.ITEM_CD ?? ''}</td>
                  <td className="p-2 text-left">{r.ITEM_NM ?? ''}</td>
                  <td className="p-2 text-center">{cstCd}</td>
                  <td className="p-2 text-left">{cstNm}</td>
                </tr>
              ))}
              {detail.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">거래처에 등록된 제품이 없습니다.</td>
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
            <div className="font-semibold">고객사 선택</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col text-sm"><span className="mb-1">코드</span><input className="h-8 border rounded px-2" value={tmpCd} onChange={(e) => setTmpCd(e.target.value)} /></label>
              <label className="flex flex-col text-sm"><span className="mb-1">이름</span><input className="h-8 border rounded px-2" value={tmpNm} onChange={(e) => setTmpNm(e.target.value)} /></label>
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
