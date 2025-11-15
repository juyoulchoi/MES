import { useState } from 'react';
import { http } from '@/lib/http';

// 시스템 LOG 조회 (MMSM07006S)
// 필터: 기간(시작/종료), 구분(EVT_TP)
// 기능: 조회, 엑셀

type Row = {
  EVT_DT?: string;   // 발생일시
  EVT_TP?: string;   // 구분
  PROC_NM?: string;  // PROCEDURE 명
  CLT_NM?: string;   // 내용
  MSG?: string;      // 비고
  [k: string]: any;
};

function toYmd(s: string | undefined) {
  if (!s) return '';
  return s.replace(/-/g, '');
}

export default function MMSM07006S() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [evtTp, setEvtTp] = useState('');

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_ymd', toYmd(startDate));
      if (endDate) params.set('end_ymd', toYmd(endDate));
      if (evtTp) params.set('evt_tp', evtTp);
      const url = `/api/m07/mmsm07006/list` + (params.toString() ? `?${params.toString()}` : '');
      const data = await http<Row[]>(url);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['발생일시','구분','PROCEDURE명','내용','비고'];
    const lines = rows.map(r => [
      r.EVT_DT ?? '',
      r.EVT_TP ?? '',
      r.PROC_NM ?? '',
      r.CLT_NM ?? '',
      r.MSG ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM07006S_log.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">시스템 LOG 조회</div>

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
          <span className="mb-1">구분</span>
          <input className="h-8 border rounded px-2 w-40" value={evtTp} onChange={e=>setEvtTp(e.target.value)} placeholder="예: ERROR/INFO" />
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Grid */}
      <div className="border rounded overflow-auto max-h>[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-48 p-2 text-center">발생일시</th>
              <th className="w-24 p-2 text-center">구분</th>
              <th className="w-60 p-2 text-center">PROCEDURE 명</th>
              <th className="p-2 text-left">내용</th>
              <th className="w-40 p-2 text-center">비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center">{r.EVT_DT ?? ''}</td>
                <td className="p-2 text-center">{r.EVT_TP ?? ''}</td>
                <td className="p-2 text-center">{r.PROC_NM ?? ''}</td>
                <td className="p-2 text-left">{r.CLT_NM ?? ''}</td>
                <td className="p-2 text-center">{r.MSG ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 설정하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
