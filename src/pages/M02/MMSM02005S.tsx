import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 모니터링 (MMSM02005S)
// 필터 없음. 기능: 조회, 엑셀(CSV)
// 그리드 컬럼: 생산계획일자, 생산계획순번, 제품명, 공정 단계(P01~P13)

type Row = Record<string, any>;

export default function MMSM02005S() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const data = await http<Row[]>(`/api/m02/mmsm02005/list`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const headers = [
      '생산계획일자','생산계획순번','제품명','제판','재단','인쇄','제본','코팅','합지기','톰슨','가공','트레이','창문','소분','접착','출고'
    ];
    const lines = rows.map(r => [
      r.PRD_PLAN_YMD ?? '',
      r.PRD_PLAN_SEQ ?? '',
      r.ITEM_NM ?? '',
      r.P01 ?? '',
      r.P02 ?? '',
      r.P03 ?? '',
      r.P04 ?? '',
      r.P05 ?? '',
      r.P06 ?? '',
      r.P07 ?? '',
      r.P08 ?? '',
      r.P09 ?? '',
      r.P10 ?? '',
      r.P11 ?? '',
      r.P12 ?? '',
      r.P13 ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM02005S.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">모니터링</div>
        <div className="flex gap-2">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      <div className="border rounded overflow-auto max-h-[75vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-28 p-2 text-center">생산계획일자</th>
              <th className="w-24 p-2 text-center">생산계획순번</th>
              <th className="w-40 p-2 text-left">제품명</th>
              <th className="w-20 p-2 text-center">제판</th>
              <th className="w-20 p-2 text-center">재단</th>
              <th className="w-20 p-2 text-center">인쇄</th>
              <th className="w-20 p-2 text-center">제본</th>
              <th className="w-20 p-2 text-center">코팅</th>
              <th className="w-20 p-2 text-center">합지기</th>
              <th className="w-20 p-2 text-center">톰슨</th>
              <th className="w-20 p-2 text-center">가공</th>
              <th className="w-20 p-2 text-center">트레이</th>
              <th className="w-20 p-2 text-center">창문</th>
              <th className="w-20 p-2 text-center">소분</th>
              <th className="w-20 p-2 text-center">접착</th>
              <th className="w-20 p-2 text-center">출고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center">{r.PRD_PLAN_YMD ?? ''}</td>
                <td className="p-2 text-center">{r.PRD_PLAN_SEQ ?? ''}</td>
                <td className="p-2 text-left">{r.ITEM_NM ?? ''}</td>
                <td className="p-2 text-center">{r.P01 ?? ''}</td>
                <td className="p-2 text-center">{r.P02 ?? ''}</td>
                <td className="p-2 text-center">{r.P03 ?? ''}</td>
                <td className="p-2 text-center">{r.P04 ?? ''}</td>
                <td className="p-2 text-center">{r.P05 ?? ''}</td>
                <td className="p-2 text-center">{r.P06 ?? ''}</td>
                <td className="p-2 text-center">{r.P07 ?? ''}</td>
                <td className="p-2 text-center">{r.P08 ?? ''}</td>
                <td className="p-2 text-center">{r.P09 ?? ''}</td>
                <td className="p-2 text-center">{r.P10 ?? ''}</td>
                <td className="p-2 text-center">{r.P11 ?? ''}</td>
                <td className="p-2 text-center">{r.P12 ?? ''}</td>
                <td className="p-2 text-center">{r.P13 ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={16} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조회 버튼을 눌러 갱신하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
