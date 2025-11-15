import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 원자재 재고조정 내역 (MMSM01011S)
// ASPX 필터 및 컬럼을 반영한 맞춤 구현

type Row = Record<string, any>;

function fmtDateYMD(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, '0');
  const day = `${dt.getDate()}`.padStart(2, '0');
  return `${y}${m}${day}`;
}

export default function MMSM01011S() {
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Init today for both dates
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
      const qs = new URLSearchParams({
        start: fmtDateYMD(startDate),
        end: fmtDateYMD(endDate),
      }).toString();
      const data = await http<Row[]>(`/api/m01/mmsm01011/list?${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // 엑셀(간단 CSV) 내보내기
  function onExportCsv() {
    const headers = [
      '순번','조정일자','품목구분','자재구분','창고','품목코드','품목명','수량','단위','비고'
    ];
    const lines = rows.map((r, i) => {
      return [
        r.RNUM ?? i + 1,
        r.REQ_YMD ?? '',
        r.ITEM_GB ?? '',
        r.OBT_GB ?? '',
        r.STORAGE_CD ?? '',
        r.ITEM_CD ?? '',
        r.ITEM_NM ?? '',
        r.QTY ?? '',
        r.UNIT_CD ?? '',
        r.DESC ?? '',
      ]
        .map(v => (v ?? '').toString().replace(/"/g, '""'))
        .map(v => `"${v}"`).join(',');
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM01011S.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">원자재 재고조정 내역</div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">실사일자(시작)</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 border rounded px-2" />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">실사일자(끝)</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 border rounded px-2" />
        </label>
        <div className="flex gap-2 md:col-span-1 lg:col-span-1 justify-end">
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
              <th className="w-28 p-2 text-center">조정일자</th>
              <th className="w-24 p-2 text-center">품목구분</th>
              <th className="w-24 p-2 text-center">자재구분</th>
              <th className="w-28 p-2 text-center">창고</th>
              <th className="w-28 p-2 text-center">품목코드</th>
              <th className="p-2 text-center">품목명</th>
              <th className="w-24 p-2 text-right">수량</th>
              <th className="w-20 p-2 text-center">단위</th>
              <th className="w-64 p-2 text-left">비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center">{r.RNUM ?? i + 1}</td>
                <td className="p-2 text-center">{r.REQ_YMD ?? ''}</td>
                <td className="p-2 text-center">{r.ITEM_GB ?? ''}</td>
                <td className="p-2 text-center">{r.OBT_GB ?? ''}</td>
                <td className="p-2 text-center">{r.STORAGE_CD ?? ''}</td>
                <td className="p-2 text-center">{r.ITEM_CD ?? ''}</td>
                <td className="p-2 text-center">{r.ITEM_NM ?? ''}</td>
                <td className="p-2 text-right">{r.QTY ?? ''}</td>
                <td className="p-2 text-center">{r.UNIT_CD ?? ''}</td>
                <td className="p-2">{r.DESC ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 선택하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
