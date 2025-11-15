import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 수주 등록/편집 (MMSM04009E)
// 레이아웃: 좌(마스터 선택 목록) | 가운데(추가/삭제 버튼) | 우(디테일 편집)
// 필터: 수주일자(단일), 순번, 거래처(코드/명)
// 기능: 초기화, 조회(마스터/디테일 동시), 추가(마스터→디테일), 삭제(디테일), 저장(체크된 행만), 엑셀(디테일 CSV)
// 디테일 컬럼: ITEM_CD, ITEM_NM, UNIT_CD(hidden), QTY(edit), EM_GB(edit), DESC(edit), SO_SUB_SEQ(hidden), END_YN(hidden), SAL_TP(hidden)

type Row = Record<string, any>;

function toYMD(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, '0');
  const day = `${dt.getDate()}`.padStart(2, '0');
  return `${y}${m}${day}`;
}

export default function MMSM04009E() {
  // Filters
  const [soYmd, setSoYmd] = useState('');
  const [seq, setSeq] = useState('');
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');

  // Data
  const [master, setMaster] = useState<Row[]>([]); // 선택 소스 목록
  const [detail, setDetail] = useState<Row[]>([]); // 수주 상세 목록
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 고객 간단 선택 모달
  const [custOpen, setCustOpen] = useState(false);
  const [tmpCd, setTmpCd] = useState('');
  const [tmpNm, setTmpNm] = useState('');

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = `${today.getMonth() + 1}`.padStart(2, '0');
    const dd = `${today.getDate()}`.padStart(2, '0');
    setSoYmd(`${yyyy}-${mm}-${dd}`);
  }, []);

  async function fetchMaster() {
    const qs = new URLSearchParams({ so_ymd: toYMD(soYmd), seq: seq || '', cst_cd: cstCd || '' }).toString();
    const data = await http<Row[]>(`/api/m04/mmsm04009/master?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }
  async function fetchDetail() {
    const qs = new URLSearchParams({ so_ymd: toYMD(soYmd), seq: seq || '', cst_cd: cstCd || '' }).toString();
    const data = await http<Row[]>(`/api/m04/mmsm04009/detail?${qs}`);
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

  function onClear() {
    setSeq('');
    setCstCd('');
    setCstNm('');
    setMaster([]);
    setDetail([]);
    setError(null);
  }

  function toggleMaster(i: number, checked: boolean) {
    setMaster(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }
  function toggleDetail(i: number, checked: boolean) {
    setDetail(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }
  function patchDetail(i: number, patch: Partial<Row>) {
    setDetail(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch, CHECK: true }; return next; });
  }

  function onAdd() {
    if (!cstCd) { setError('거래처를 먼저 선택하세요.'); return; }
    const selected = master.filter(r => r.CHECK);
    if (selected.length === 0) { setError('추가할 품목을 선택하세요.'); return; }
    setError(null);

    setDetail(prev => {
      const byKey = new Set(prev.map(r => `${r.ITEM_CD}`));
      const toAdd = selected.filter(r => !byKey.has(`${r.ITEM_CD}`)).map(r => ({
        CHECK: true,
        ITEM_CD: r.ITEM_CD ?? '',
        ITEM_NM: r.ITEM_NM ?? '',
        UNIT_CD: r.UNIT_CD ?? '',
        QTY: r.QTY ?? '',
        EM_GB: r.EM_GB ?? '',
        DESC: r.DESC ?? '',
        SO_SUB_SEQ: r.SO_SUB_SEQ ?? '',
        END_YN: r.END_YN ?? '',
        SAL_TP: r.SAL_TP ?? '',
      }));
      return [...prev, ...toAdd];
    });
  }

  function onDelete() {
    const anyChecked = detail.some(r => r.CHECK);
    if (!anyChecked) { setError('삭제할 행을 선택하세요.'); return; }
    setError(null);
    setDetail(prev => prev.filter(r => !r.CHECK));
  }

  async function onSave() {
    const targets = detail.filter(r => r.CHECK);
    if (targets.length === 0) { setError('저장할 대상이 없습니다.'); return; }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true); setError(null);
    try {
      const payload = targets.map(r => ({
        SO_YMD: toYMD(soYmd),
        SEQ: seq || '',
        CST_CD: cstCd || '',
        ITEM_CD: r.ITEM_CD ?? '',
        UNIT_CD: r.UNIT_CD ?? '',
        QTY: r.QTY ?? '',
        EM_GB: r.EM_GB ?? '',
        DESC: r.DESC ?? '',
        SO_SUB_SEQ: r.SO_SUB_SEQ ?? '',
        END_YN: r.END_YN ?? '',
        SAL_TP: r.SAL_TP ?? '',
      }));
      await http(`/api/m04/mmsm04009/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['선택','품목코드','품목명','단위','수량','긴급구분','비고','영업상세순번','종료여부','판매구분'];
    const lines = detail.map((r) => [
      r.CHECK ? 'Y' : 'N',
      r.ITEM_CD ?? '',
      r.ITEM_NM ?? '',
      r.UNIT_CD ?? '',
      r.QTY ?? '',
      r.EM_GB ?? '',
      r.DESC ?? '',
      r.SO_SUB_SEQ ?? '',
      r.END_YN ?? '',
      r.SAL_TP ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM04009E_detail.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function openCustomerPicker() { setTmpCd(cstCd); setTmpNm(cstNm); setCustOpen(true); }
  function applyCustomer() { setCstCd(tmpCd.trim()); setCstNm(tmpNm.trim()); setCustOpen(false); }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">수주 등록</div>

      {/* Filters & Top Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">수주일자</span>
          <input type="date" className="h-8 border rounded px-2" value={soYmd} onChange={(e) => setSoYmd(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">순번</span>
          <input className="h-8 border rounded px-2" value={seq} onChange={(e) => setSeq(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm md:col-span-2">
          <span className="mb-1">거래처명</span>
          <div className="flex gap-1">
            <input value={cstCd} readOnly className="h-8 border rounded px-2 w-28 bg-muted" placeholder="코드" />
            <input value={cstNm} readOnly className="h-8 border rounded px-2 flex-1 bg-muted" placeholder="거래처 선택" />
            <button type="button" className="h-8 px-2 border rounded" onClick={openCustomerPicker}>...</button>
          </div>
        </label>
        <div className="flex gap-2 justify-end md:col-span-2">
          <button onClick={onClear} className="h-8 px-3 border rounded">초기화</button>
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Layout: Master | Buttons | Detail */}
      <div className="grid grid-cols-12 gap-3">
        {/* Master */}
        <div className="col-span-12 md:col-span-4 border rounded overflow-auto max-h-[65vh]">
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
                  <td colSpan={3} className="p-3 text-center text-muted-foreground">목록이 없습니다. 조건 입력 후 조회하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Middle Buttons */}
        <div className="col-span-12 md:col-span-1 flex md:flex-col gap-2 items-center justify-center">
          <button onClick={onDelete} disabled={loading} className="h-8 px-3 border rounded">삭제</button>
          <button onClick={onAdd} disabled={loading || !cstCd} className="h-8 px-3 border rounded">추가</button>
        </div>

        {/* Detail */}
        <div className="col-span-12 md:col-span-7 border rounded overflow-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-28 p-2 text-center">품목코드</th>
                <th className="p-2 text-left">품목명</th>
                <th className="w-20 p-2 text-center">단위</th>
                <th className="w-24 p-2 text-right">수량</th>
                <th className="w-24 p-2 text-center">긴급구분</th>
                <th className="w-40 p-2 text-left">비고</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleDetail(i, e.target.checked)} /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_CD ?? ''} readOnly /></td>
                  <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_NM ?? ''} readOnly /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.UNIT_CD ?? ''} onChange={e => patchDetail(i, { UNIT_CD: e.target.value })} /></td>
                  <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.QTY ?? ''} onChange={e => patchDetail(i, { QTY: e.target.value })} /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.EM_GB ?? ''} onChange={e => patchDetail(i, { EM_GB: e.target.value })} /></td>
                  <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.DESC ?? ''} onChange={e => patchDetail(i, { DESC: e.target.value })} /></td>
                </tr>
              ))}
              {detail.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-muted-foreground">상세가 없습니다. 좌측에서 선택하여 추가하세요.</td>
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
