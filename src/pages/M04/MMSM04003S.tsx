import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 제품출고현황 (MMSM04003S)
// 필터: 출고일자(시작/끝)
// 기능: 조회, 엑셀(CSV)
// 컬럼: 순번(RNUM), 수주일자(SO_YMD), 출고일자(GI_DT), 품명(ITEM_NM), 거래처명(CST_NM), 수주수량(SO_QTY), 출고수량(GI_QTY), 외주출고여부(DIR_YN)

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

export default function MMSM04003S() {
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data
  const [rows, setRows] = useState<Row[]>([]);
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
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams({ start: toYMD(startDate), end: toYMD(endDate) }).toString();
      const data = await http<Row[]>(`/api/m04/mmsm04003/list?${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['순번','수주일자','출고일자','품명','거래처명','수주수량','출고수량','외주출고여부'];
    const lines = rows.map((r, i) => [
      r.RNUM ?? i + 1,
      r.SO_YMD ?? '',
      r.GI_DT ?? '',
      r.ITEM_NM ?? '',
      r.CST_NM ?? '',
      r.SO_QTY ?? '',
      r.GI_QTY ?? '',
      r.DIR_YN ?? '',
    ].map(v => (v ?? '').toString().replace(/\"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM04003S.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">제품출고현황</div>

      {/* Filters & Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">출고일자(시작)</span>
          <input type="date" className="h-8 border rounded px-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">출고일자(끝)</span>
          <input type="date" className="h-8 border rounded px-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <div className="flex gap-2 md:col-span-2 justify-end">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Grid */}
      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-16 p-2 text-center">순번</th>
              <th className="w-28 p-2 text-center">수주일자</th>
              <th className="w-28 p-2 text-center">출고일자</th>
              <th className="p-2 text-left">품명</th>
              <th className="w-40 p-2 text-left">거래처명</th>
              <th className="w-24 p-2 text-right">수주수량</th>
              <th className="w-24 p-2 text-right">출고수량</th>
              <th className="w-28 p-2 text-center">외주출고여부</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center">{r.RNUM ?? i + 1}</td>
                <td className="p-2 text-center">{r.SO_YMD ?? ''}</td>
                <td className="p-2 text-center">{r.GI_DT ?? ''}</td>
                <td className="p-2 text-left">{r.ITEM_NM ?? ''}</td>
                <td className="p-2 text-left">{r.CST_NM ?? ''}</td>
                <td className="p-2 text-right">{r.SO_QTY ?? ''}</td>
                <td className="p-2 text-right">{r.GI_QTY ?? ''}</td>
                <td className="p-2 text-center">{r.DIR_YN ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 선택하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
