import { useEffect, useMemo, useState } from 'react';
import { http } from '@/lib/http';
import { useCodes } from '@/lib/hooks/useCodes';

// 원자재 발주 등록 (MMSM01008E)
// 좌측: 마스터(선택) / 우측: 디테일(추가/삭제/저장)
// 조건: 수주일자(시작/끝), 발주여부

type MasterRow = {
  CHECK?: boolean;
  CST_NM?: string;
  ITEM_CD?: string;
  ITEM_NM?: string;
  QTY?: number | string;
};

type DetailRow = {
  CHECK?: boolean;
  SO_SUB_SEQ?: number | string;
  ITEM_CD?: string;
  ITEM_NM?: string;
  UNIT_CD?: string;
  QTY?: number | string;
  ITEM_TP?: string;
  STANDAD?: string; // 원문 오타 유지(STANDARD 아님)
  EM_GB?: string; // 1100 그룹
  END_YN?: string;
  DESC?: string;
  SAL_TP?: string;
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

export default function MMSM01008E() {
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [poYn, setPoYn] = useState(false);

  // Data
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [detail, setDetail] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Codes
  const { codes: emCodes } = useCodes('1100', []);

  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = `${today.getMonth() + 1}`.padStart(2, '0');
    const dd = `${today.getDate()}`.padStart(2, '0');
    const ymd = `${yyyy}-${mm}-${dd}`;
    setStartDate(ymd);
    setEndDate(ymd);
    // 초기 조회: 마스터/디테일
    void onSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMaster() {
    const qs = new URLSearchParams({
      start: toYMD(startDate),
      end: toYMD(endDate),
      po_yn: poYn ? 'Y' : 'N',
    }).toString();
    const data = await http<MasterRow[]>(`/api/m01/mmsm01008/master?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }

  async function loadDetail() {
    const qs = new URLSearchParams({ start: toYMD(startDate) }).toString();
    const data = await http<DetailRow[]>(`/api/m01/mmsm01008/detail?${qs}`);
    return (Array.isArray(data) ? data : []).map((r, i) => ({
      CHECK: false,
      SO_SUB_SEQ: r.SO_SUB_SEQ ?? i + 1,
      ITEM_CD: r.ITEM_CD ?? '',
      ITEM_NM: r.ITEM_NM ?? '',
      UNIT_CD: r.UNIT_CD ?? '',
      QTY: r.QTY ?? '',
      ITEM_TP: r.ITEM_TP ?? '',
      STANDAD: (r as any).STANDAD ?? (r as any).STANDARD ?? '',
      EM_GB: r.EM_GB ?? 'G',
      END_YN: r.END_YN ?? '',
      DESC: r.DESC ?? '',
      SAL_TP: r.SAL_TP ?? '',
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
    // 선택된 마스터 행들 → 디테일의 선두에 추가
    const selected = master.filter(r => r.CHECK);
    if (selected.length === 0) return;
    setDetail(prev => {
      const list: DetailRow[] = [];
      selected.forEach((m) => {
        list.push({
          CHECK: true,
          SO_SUB_SEQ: (prev.length + list.length + 1),
          EM_GB: 'G',
          UNIT_CD: 'C',
          QTY: '0',
          ITEM_CD: m.ITEM_CD ?? '',
          ITEM_NM: m.ITEM_NM ?? '',
          END_YN: '',
        });
      });
      return [...list, ...prev];
    });
  }

  function onDeleteDetail() {
    setDetail(prev => prev.filter(r => !r.CHECK));
  }

  async function onSave() {
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
        METHOD: 'I' as const,
        SO_YMD: toYMD(startDate),
        SO_SUB_SEQ: r.SO_SUB_SEQ ?? '',
        SAL_TP: r.SAL_TP ?? '',
        DESC: r.DESC ?? '',
        ITEM_CD: r.ITEM_CD ?? '',
        UNIT_CD: r.UNIT_CD ?? '',
        QTY: r.QTY ?? '',
      }));
      await http(`/api/m01/mmsm01008/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onCalc() {
    // 소요량계산: 선택된 마스터 행 기준으로 날짜 전달
    const keys = master.filter(r => r.CHECK);
    if (keys.length === 0) {
      setError('소요량계산 대상이 없습니다.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = keys.map(() => ({ SO_YMD: toYMD(startDate) }));
      await http(`/api/m01/mmsm01008/calc`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const headers = ['선택','거래처','품목코드','품목명','수량'];
    const lines = master.map((r, i) => [
      r.CHECK ? 'Y' : '',
      r.CST_NM ?? '',
      r.ITEM_CD ?? '',
      r.ITEM_NM ?? '',
      r.QTY ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}` + `"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM01008E_master.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">원자재 발주 등록</div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">수주일자(시작)</span>
          <input type="date" className="h-8 border rounded px-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">수주일자(끝)</span>
          <input type="date" className="h-8 border rounded px-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={poYn} onChange={(e) => setPoYn(e.target.checked)} />
          <span>발주여부</span>
        </label>
        <div className="flex gap-2 justify-end">
          <button onClick={onCalc} disabled={loading} className="h-8 px-3 border rounded">소요량계산</button>
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Split: Master | Buttons | Detail */}
      <div className="grid grid-cols-12 gap-3">
        {/* Master 30% (col-span-4) */}
        <div className="col-span-12 md:col-span-4 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-36 p-2 text-center">거래처</th>
                <th className="w-0 p-2 text-center">품목코드</th>
                <th className="p-2 text-center">품목명</th>
                <th className="w-20 p-2 text-right">수량</th>
              </tr>
            </thead>
            <tbody>
              {master.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleMaster(i, e.target.checked)} /></td>
                  <td className="p-2 text-center">{r.CST_NM ?? ''}</td>
                  <td className="p-2 text-center">{r.ITEM_CD ?? ''}</td>
                  <td className="p-2 text-left">{r.ITEM_NM ?? ''}</td>
                  <td className="p-2 text-right">{r.QTY ?? ''}</td>
                </tr>
              ))}
              {master.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">마스터 데이터가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Middle buttons 5% (col-span-1) */}
        <div className="col-span-12 md:col-span-1 flex md:flex-col gap-2 items-center justify-center">
          <button onClick={onDeleteDetail} className="h-8 px-3 border rounded">삭제</button>
          <button onClick={onAddFromMaster} className="h-8 px-3 border rounded">추가</button>
        </div>

        {/* Detail 65% (col-span-7) */}
        <div className="col-span-12 md:col-span-7 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-24 p-2 text-center">원자재</th>
                <th className="p-2 text-center">원자재명</th>
                <th className="w-20 p-2 text-center">UNIT</th>
                <th className="w-24 p-2 text-right">수량</th>
                <th className="w-28 p-2">종류</th>
                <th className="w-28 p-2 text-center">규격(STANDAD)</th>
                <th className="w-28 p-2 text-center">EM 구분</th>
                <th className="w-40 p-2">비고</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleDetail(i, e.target.checked)} /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_CD || ''} readOnly /></td>
                  <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full bg-muted" value={r.ITEM_NM || ''} readOnly /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.UNIT_CD || ''} onChange={e => onDetailChange(i, { UNIT_CD: e.target.value })} /></td>
                  <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.QTY ?? ''} onChange={e => onDetailChange(i, { QTY: e.target.value })} /></td>
                  <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.ITEM_TP || ''} onChange={e => onDetailChange(i, { ITEM_TP: e.target.value })} /></td>
                  <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.STANDAD || ''} onChange={e => onDetailChange(i, { STANDAD: e.target.value })} /></td>
                  <td className="p-1 text-center">
                    <select className="h-8 border rounded px-2 w-full" value={r.EM_GB || ''} onChange={e => onDetailChange(i, { EM_GB: e.target.value })}>
                      <option value=""></option>
                      {emCodes.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.DESC || ''} onChange={e => onDetailChange(i, { DESC: e.target.value })} /></td>
                </tr>
              ))}
              {detail.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-3 text-center text-muted-foreground">디테일 데이터가 없습니다. 마스터에서 선택 후 추가하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
