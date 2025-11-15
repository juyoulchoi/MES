import { useState } from 'react';
import { http } from '@/lib/http';

// 시스템 사용현황 조회 (MMSM07005S)
// 필터: 기간(시작/종료), 접속구분
// 기능: 조회, 엑셀

type Row = {
  ACS_DT?: string;   // 접속일시
  ACS_TP?: string;   // 접속구분
  PGM_ID?: string;   // 프로그램ID
  USR_NM?: string;   // 사용자
  [k: string]: any;
};

function toYmd(s: string | undefined) {
  if (!s) return '';
  // input type date: yyyy-MM-dd -> yyyymmdd
  return s.replace(/-/g, '');
}

export default function MMSM07005S() {
  const [startDate, setStartDate] = useState(''); // yyyy-MM-dd
  const [endDate, setEndDate] = useState('');     // yyyy-MM-dd
  const [accessType, setAccessType] = useState('');

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_ymd', toYmd(startDate));
      if (endDate) params.set('end_ymd', toYmd(endDate));
      if (accessType) params.set('acs_tp', accessType);
      const url = `/api/m07/mmsm07005/list` + (params.toString() ? `?${params.toString()}` : '');
      const data = await http<Row[]>(url);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['접속일시','접속구분','프로그램ID','사용자'];
    const lines = rows.map(r => [
      r.ACS_DT ?? '',
      r.ACS_TP ?? '',
      r.PGM_ID ?? '',
      r.USR_NM ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM07005S_usage.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">시스템 사용현황 조회</div>

      {/* Filters & Buttons */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">시작일</span>
          <input type="date" className="h-8 border rounded px-2 w-40" value={startDate} onChange={e=>setStartDate(e.target.value)} />
        </label>
        <label className="self-end">~</label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">종료일</span>
          <input type="date" className="h-8 border rounded px-2 w-40" value={endDate} onChange={e=>setEndDate(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">접속구분</span>
          <input className="h-8 border rounded px-2 w-40" value={accessType} onChange={e=>setAccessType(e.target.value)} placeholder="예: LOGIN/LOGOUT" />
        </label>
        <div className="ml-auto flex gap-2">
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
              <th className="w-48 p-2 text-center">접속일시</th>
              <th className="w-32 p-2 text-center">접속구분</th>
              <th className="w-40 p-2 text-center">프로그램ID</th>
              <th className="w-32 p-2 text-center">사용자</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center">{r.ACS_DT ?? ''}</td>
                <td className="p-2 text-center">{r.ACS_TP ?? ''}</td>
                <td className="p-2 text-center">{r.PGM_ID ?? ''}</td>
                <td className="p-2 text-center">{r.USR_NM ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 설정하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
