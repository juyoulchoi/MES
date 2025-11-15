import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 생산계획 생성 (MMSM02002E)
// 상단: 수주일자 필터 + 조회/추가/저장/삭제/엑셀
// 본문: 마스터 그리드 + 하단(좌: 재단, 우: 재단원자재) 그리드

type MasterRow = {
  CHECK?: boolean;
  ISNEW?: boolean;
  SO_YMD?: string; // 수주일자(yyyy.MM.dd or yyyymmdd)
  ITEM_CD?: string;
  ITEM_NM?: string;
  CST_CD?: string;
  CST_NM?: string;
  ITEM_TP?: string;
  WID?: string | number;
  HGT?: string | number;
  QTY?: string | number;
  PRD_PLAN_YMD?: string;
};

type DetailMatRow = {
  CHECK?: boolean;
  PRE_MAT_NM?: string;   // 공정코드
  PRE_MAT_SPEC?: string; // 공정명
};

type DetailItemRow = {
  CHECK?: boolean;
  PRE_MED_NM?: string;       // 구분
  CHECK_METHOD_NM?: string;  // 종류
  CHECK_CYCLE?: string;      // 규격
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

export default function MMSM02002E() {
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data
  const [master, setMaster] = useState<MasterRow[]>([]);
  const [detailMat, setDetailMat] = useState<DetailMatRow[]>([]);
  const [detailItem, setDetailItem] = useState<DetailItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ start: toYMD(startDate), end: toYMD(endDate) }).toString();
      const data = await http<MasterRow[]>(`/api/m02/mmsm02002/master?${qs}`);
      const list = (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false, ISNEW: false }));
      setMaster(list);
      // 조회 시 디테일은 초기화(마스터 선택 후 추가/조회 흐름 반영)
      setDetailMat([]);
      setDetailItem([]);
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

  function onAddMaster() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = `${today.getMonth() + 1}`.padStart(2, '0');
    const dd = `${today.getDate()}`.padStart(2, '0');
    const ymdDot = `${yyyy}.${mm}.${dd}`;
    setMaster(prev => [
      {
        CHECK: true,
        ISNEW: true,
        SO_YMD: ymdDot,
        ITEM_CD: '',
        ITEM_NM: '',
        CST_CD: '',
        CST_NM: '',
        ITEM_TP: '',
        WID: '',
        HGT: '',
        QTY: '',
        PRD_PLAN_YMD: ymdDot,
      },
      ...prev,
    ]);
  }

  function onDeleteMaster() {
    // 신규행은 즉시 제거, 기존행은 CHECK 표시된 것만 제외(서버 삭제는 저장 시 처리 가능)
    setMaster(prev => prev.filter(r => !(r.CHECK && r.ISNEW)));
  }

  function onExportCsv() {
    const headers = ['선택','수주일자','제품코드','제품명','거래처코드','거래처명','종류','가로','세로','계획수량','등록일자'];
    const lines = master.map(r => [
      r.CHECK ? 'Y' : '',
      r.SO_YMD ?? '',
      r.ITEM_CD ?? '',
      r.ITEM_NM ?? '',
      r.CST_CD ?? '',
      r.CST_NM ?? '',
      r.ITEM_TP ?? '',
      r.WID ?? '',
      r.HGT ?? '',
      r.QTY ?? '',
      r.PRD_PLAN_YMD ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM02002E_master.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function onSave() {
    // 선택된 마스터 기준으로 저장 생성 처리(서버 규격 협의 필요)
    const targets = master.filter(r => r.CHECK);
    if (targets.length === 0) {
      setError('저장할 대상이 없습니다.');
      return;
    }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      const payload = targets.map(r => ({
        METHOD: r.ISNEW ? 'I' : 'U',
        SO_YMD: r.SO_YMD ?? '',
        ITEM_CD: r.ITEM_CD ?? '',
        QTY: r.QTY ?? '',
        PRD_PLAN_YMD: r.PRD_PLAN_YMD ?? '',
      }));
      await http(`/api/m02/mmsm02002/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Detail: 재단
  function toggleDetailMat(i: number, checked: boolean) {
    setDetailMat(prev => {
      const next = [...prev];
      next[i] = { ...next[i], CHECK: checked };
      return next;
    });
  }
  function addDetailMat() {
    setDetailMat(prev => ([{ CHECK: true, PRE_MAT_NM: '', PRE_MAT_SPEC: '' }, ...prev]));
  }
  function delDetailMat() {
    setDetailMat(prev => prev.filter(r => !r.CHECK));
  }
  function onChangeDetailMat(i: number, patch: Partial<DetailMatRow>) {
    setDetailMat(prev => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch, CHECK: true };
      return next;
    });
  }

  // Detail: 재단원자재
  function toggleDetailItem(i: number, checked: boolean) {
    setDetailItem(prev => {
      const next = [...prev];
      next[i] = { ...next[i], CHECK: checked };
      return next;
    });
  }
  function addDetailItem() {
    setDetailItem(prev => ([{ CHECK: true, PRE_MED_NM: '', CHECK_METHOD_NM: '', CHECK_CYCLE: '' }, ...prev]));
  }
  function delDetailItem() {
    setDetailItem(prev => prev.filter(r => !r.CHECK));
  }
  function onChangeDetailItem(i: number, patch: Partial<DetailItemRow>) {
    setDetailItem(prev => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch, CHECK: true };
      return next;
    });
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">생산계획 생성</div>

      {/* Filters & Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">수주일자(시작)</span>
          <input type="date" className="h-8 border rounded px-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">수주일자(끝)</span>
          <input type="date" className="h-8 border rounded px-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <div className="md:col-span-3 flex gap-2 justify-end">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onAddMaster} disabled={loading} className="h-8 px-3 border rounded">추가</button>
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
          <button onClick={onDeleteMaster} disabled={loading} className="h-8 px-3 border rounded">삭제</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Master Grid */}
      <div className="border rounded overflow-auto max-h-[35vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-12 p-2 text-center">선택</th>
              <th className="w-28 p-2 text-center">수주일자</th>
              <th className="w-0 p-2 text-center">제품코드</th>
              <th className="w-40 p-2 text-left">제품명</th>
              <th className="w-28 p-2 text-center">거래처코드</th>
              <th className="w-36 p-2 text-left">거래처명</th>
              <th className="w-24 p-2 text-left">종류</th>
              <th className="w-20 p-2 text-right">가로</th>
              <th className="w-20 p-2 text-right">세로</th>
              <th className="w-24 p-2 text-right">계획수량</th>
              <th className="w-28 p-2 text-center">등록일자</th>
            </tr>
          </thead>
          <tbody>
            {master.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleMaster(i, e.target.checked)} /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.SO_YMD ?? ''} readOnly /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.ITEM_CD ?? ''} readOnly /></td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full" value={r.ITEM_NM ?? ''} readOnly /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.CST_CD ?? ''} readOnly /></td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full" value={r.CST_NM ?? ''} readOnly /></td>
                <td className="p-1 text-left"><input className="h-8 border rounded px-2 w-full" value={r.ITEM_TP ?? ''} readOnly /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.WID ?? ''} readOnly /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.HGT ?? ''} readOnly /></td>
                <td className="p-1 text-right"><input className="h-8 border rounded px-2 w-full text-right" value={r.QTY ?? ''} readOnly /></td>
                <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.PRD_PLAN_YMD ?? ''} readOnly /></td>
              </tr>
            ))}
            {master.length === 0 && (
              <tr>
                <td colSpan={11} className="p-3 text-center text-muted-foreground">마스터 데이터가 없습니다. 조건 선택 후 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Split */}
      <div className="grid grid-cols-12 gap-3">
        {/* 재단 */}
        <div className="col-span-12 md:col-span-6 space-y-2">
          <div className="flex items-center gap-2">
            <button onClick={addDetailMat} className="h-8 px-3 border rounded">재단추가</button>
            <button onClick={delDetailMat} className="h-8 px-3 border rounded">재단삭제</button>
          </div>
          <div className="border rounded overflow-auto max-h-[32vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="w-12 p-2 text-center">선택</th>
                  <th className="w-40 p-2 text-left">공정코드</th>
                  <th className="p-2 text-left">공정명</th>
                </tr>
              </thead>
              <tbody>
                {detailMat.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleDetailMat(i, e.target.checked)} /></td>
                    <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.PRE_MAT_NM ?? ''} onChange={e => onChangeDetailMat(i, { PRE_MAT_NM: e.target.value })} /></td>
                    <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.PRE_MAT_SPEC ?? ''} onChange={e => onChangeDetailMat(i, { PRE_MAT_SPEC: e.target.value })} /></td>
                  </tr>
                ))}
                {detailMat.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-3 text-center text-muted-foreground">재단 데이터가 없습니다. 추가 버튼으로 행을 추가하세요.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 재단원자재 */}
        <div className="col-span-12 md:col-span-6 space-y-2">
          <div className="flex items-center gap-2">
            <button onClick={addDetailItem} className="h-8 px-3 border rounded">재단원자재추가</button>
            <button onClick={delDetailItem} className="h-8 px-3 border rounded">재단원자재삭제</button>
          </div>
          <div className="border rounded overflow-auto max-h-[32vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="w-12 p-2 text-center">선택</th>
                  <th className="w-40 p-2 text-left">구분</th>
                  <th className="w-40 p-2 text-left">종류</th>
                  <th className="p-2 text-center">규격</th>
                </tr>
              </thead>
              <tbody>
                {detailItem.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleDetailItem(i, e.target.checked)} /></td>
                    <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.PRE_MED_NM ?? ''} onChange={e => onChangeDetailItem(i, { PRE_MED_NM: e.target.value })} /></td>
                    <td className="p-1"><input className="h-8 border rounded px-2 w-full" value={r.CHECK_METHOD_NM ?? ''} onChange={e => onChangeDetailItem(i, { CHECK_METHOD_NM: e.target.value })} /></td>
                    <td className="p-1 text-center"><input className="h-8 border rounded px-2 w-full" value={r.CHECK_CYCLE ?? ''} onChange={e => onChangeDetailItem(i, { CHECK_CYCLE: e.target.value })} /></td>
                  </tr>
                ))}
                {detailItem.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-muted-foreground">재단원자재 데이터가 없습니다. 추가 버튼으로 행을 추가하세요.</td>
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
