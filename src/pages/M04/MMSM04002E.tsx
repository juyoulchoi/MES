import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 제품출고지시 (MMSM04002E)
// 상단: 수주일자(시작/끝), 거래처 선택
// 본문: 좌측 마스터(출고지시 헤더), 가운데 버튼(출고/추가/저장/삭제), 우측 디테일(품목별 지시 내역 편집)
// 버튼: 조회(마스터 조회), 엑셀(디테일 CSV)

// 타입은 백엔드 스펙에 맞춰 추후 정교화 예정
type MasterRow = {
  CHECK?: boolean;
  SO_YMD?: string; // 지시일자
  SO_SEQ?: string | number; // 순번
  CST_CD?: string;
  CST_NM?: string;
};

type DetailRow = {
  CHECK?: boolean;
  SO_YMD?: string;
  SO_SEQ?: string | number;
  SO_SUB_SEQ?: string | number;
  ITEM_CD?: string;
  ITEM_NM?: string;
  UNIT_CD?: string; // 단위 또는 계획/기타 표시용 바인딩
  QTY?: string | number; // 출고수량(편집)
  REQ_YMD?: string; // 출고일자(편집) - ASPX에선 REQ_YMD 사용
};

function toYMD(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, '0');
  const day = `${dt.getDate()}`.padStart(2, '0');
  return `${y}${m}${day}`;
}

function toInputDate(s?: string) {
  if (!s) return '';
  const t = String(s);
  if (/^\d{8}$/.test(t)) return `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return '';
}

export default function MMSM04002E() {
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');

  // Data
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [detail, setDetail] = useState<DetailRow[]>([]);
  const [selected, setSelected] = useState<{ so_ymd?: string; so_seq?: string | number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 고객 선택 모달(간단)
  const [custOpen, setCustOpen] = useState(false);
  const [tmpCd, setTmpCd] = useState('');
  const [tmpNm, setTmpNm] = useState('');

  // 초기값: 오늘
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = `${today.getMonth() + 1}`.padStart(2, '0');
    const dd = `${today.getDate()}`.padStart(2, '0');
    const ymd = `${yyyy}-${mm}-${dd}`;
    setStartDate(ymd);
    setEndDate(ymd);
  }, []);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ start: toYMD(startDate), end: toYMD(endDate), cst_cd: cstCd || '' }).toString();
      const data = await http<MasterRow[]>(`/api/m04/mmsm04002/master?${qs}`);
      const list = (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
      setMaster(list);
      setDetail([]);
      setSelected({});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function onSelectMaster(i: number) {
    const row = master[i];
    if (!row) return;
    const so_ymd = row.SO_YMD ? String(row.SO_YMD) : '';
    const so_seq = row.SO_SEQ ?? '';
    setSelected({ so_ymd, so_seq });
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ so_ymd: so_ymd.replace(/-/g, ''), so_seq: String(so_seq) }).toString();
      const data = await http<DetailRow[]>(`/api/m04/mmsm04002/detail?${qs}`);
      const list = (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
      setDetail(list);
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
  function onDetailChange(i: number, patch: Partial<DetailRow>) {
    setDetail(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch, CHECK: true }; return next; });
  }

  function onAddDetail() {
    if (!selected.so_ymd || selected.so_seq === undefined) {
      setError('좌측 마스터를 먼저 선택하세요.');
      return;
    }
    const newRow: DetailRow = {
      CHECK: true,
      SO_YMD: selected.so_ymd,
      SO_SEQ: selected.so_seq,
      SO_SUB_SEQ: '',
      ITEM_CD: '',
      ITEM_NM: '',
      UNIT_CD: '',
      QTY: '',
      REQ_YMD: toInputDate(selected.so_ymd),
    };
    setDetail(prev => [newRow, ...prev]);
  }

  function onDeleteDetail() { setDetail(prev => prev.filter(r => !r.CHECK)); }

  async function onSave() {
    if (!selected.so_ymd || selected.so_seq === undefined) { setError('마스터 선택 후 저장하세요.'); return; }
    const targets = detail.filter(r => r.CHECK);
    if (targets.length === 0) { setError('저장할 데이터가 없습니다.'); return; }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true); setError(null);
    try {
      const payload = targets.map(r => ({
        SO_YMD: String(selected.so_ymd).replace(/-/g, ''),
        SO_SEQ: String(selected.so_seq ?? ''),
        SO_SUB_SEQ: r.SO_SUB_SEQ ?? '',
        ITEM_CD: r.ITEM_CD ?? '',
        UNIT_CD: r.UNIT_CD ?? '',
        QTY: r.QTY ?? '',
        REQ_YMD: r.REQ_YMD ? String(r.REQ_YMD).replace(/-/g, '') : '',
      }));
      await http(`/api/m04/mmsm04002/save`, { method: 'POST', body: payload });
      // 저장 후 새로고침
      if (selected.so_ymd && selected.so_seq !== undefined) {
        const qs = new URLSearchParams({ so_ymd: String(selected.so_ymd).replace(/-/g, ''), so_seq: String(selected.so_seq) }).toString();
        const data = await http<DetailRow[]>(`/api/m04/mmsm04002/detail?${qs}`);
        const list = (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
        setDetail(list);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['순번','제품순번','제품코드','제품명','단위','출고수량','출고일자'];
    const lines = detail.map((r, i) => [
      r.SO_SEQ ?? '',
      r.SO_SUB_SEQ ?? '',
      r.ITEM_CD ?? '',
      r.ITEM_NM ?? '',
      r.UNIT_CD ?? '',
      r.QTY ?? '',
      r.REQ_YMD ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM04002E_detail.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function openCustomerPicker() { setTmpCd(cstCd); setTmpNm(cstNm); setCustOpen(true); }
  function applyCustomer() { setCstCd(tmpCd.trim()); setCstNm(tmpNm.trim()); setCustOpen(false); }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">제품출고지시</div>

      {/* Filters & Top Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">수주일자(시작)</span>
          <input type="date" className="h-8 border rounded px-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">수주일자(끝)</span>
          <input type="date" className="h-8 border rounded px-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm md:col-span-2">
          <span className="mb-1">거래처명</span>
          <div className="flex gap-1">
            <input value={cstCd} readOnly className="h-8 border rounded px-2 w-28 bg-muted" placeholder="코드" />
            <input value={cstNm} readOnly className="h-8 border rounded px-2 flex-1 bg-muted" placeholder="거래처 선택" />
            <button type="button" className="h-8 px-2 border rounded" onClick={openCustomerPicker}>...</button>
          </div>
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
        <div className="col-span-12 md:col-span-4 border rounded overflow-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-20 p-2 text-center">순번</th>
                <th className="w-28 p-2 text-center">출고지시일</th>
                <th className="p-2 text-left">거래처명</th>
                <th className="w-28 p-2 text-center">출고요청일</th>
              </tr>
            </thead>
            <tbody>
              {master.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => onSelectMaster(i)}>
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => { e.stopPropagation(); toggleMaster(i, e.target.checked); }} /></td>
                  <td className="p-2 text-center">{r.SO_SEQ ?? ''}</td>
                  <td className="p-2 text-center">{r.SO_YMD ?? ''}</td>
                  <td className="p-2 text-left">{r.CST_NM ?? ''}</td>
                  <td className="p-2 text-center">{r.SO_YMD ?? ''}</td>
                </tr>
              ))}
              {master.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">마스터 데이터가 없습니다. 조건을 입력하고 조회하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Middle Buttons */}
        <div className="col-span-12 md:col-span-1 flex md:flex-col gap-2 items-center justify-center">
          <button className="h-8 px-3 border rounded">출고</button>
          <button onClick={onAddDetail} className="h-8 px-3 border rounded">추가</button>
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
          <button onClick={onDeleteDetail} className="h-8 px-3 border rounded">삭제</button>
        </div>

        {/* Detail */}
        <div className="col-span-12 md:col-span-7 border rounded overflow-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-20 p-2 text-center">순번</th>
                <th className="w-24 p-2 text-center">제품순번</th>
                <th className="w-28 p-2 text-center">제품코드</th>
                <th className="p-2 text-left">제품명</th>
                <th className="w-20 p-2 text-center">단위</th>
                <th className="w-24 p-2 text-right">출고수량</th>
                <th className="w-28 p-2 text-center">출고일자</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleDetail(i, e.target.checked)} /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.SO_SEQ ?? ''} readOnly /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.SO_SUB_SEQ ?? ''} readOnly /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_CD ?? ''} readOnly /></td>
                  <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_NM ?? ''} readOnly /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.UNIT_CD ?? ''} onChange={e => onDetailChange(i, { UNIT_CD: e.target.value })} /></td>
                  <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.QTY ?? ''} onChange={e => onDetailChange(i, { QTY: e.target.value })} /></td>
                  <td className="p-1 text-center"><input type="date" className="h-8 border rounded px-2 w-full" value={toInputDate(r.REQ_YMD)} onChange={e => onDetailChange(i, { REQ_YMD: e.target.value })} /></td>
                </tr>
              ))}
              {detail.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-3 text-center text-muted-foreground">디테일 데이터가 없습니다. 좌측에서 마스터를 선택하거나 추가 버튼으로 생성하세요.</td>
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
