import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 제품투입품목 조회 (MMSM04007S)
// 필터 없음 (ASPX 상단 조건 비어있음)
// 기능: 조회, 엑셀(CSV)
// 컬럼: 선택(CHECK), 투입품목(ITEM_CD), 투입품목명(ITEM_NM), 단위(UNIT_CD), 입고일자(PO_YMD)

type Row = Record<string, any>;

export default function MMSM04007S() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const data = await http<Row[]>(`/api/m04/mmsm04007/list`);
      const list = (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: !!r.CHECK }));
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function toggle(i: number, checked: boolean) {
    setRows(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }

  function onExportCsv() {
    const headers = ['선택','투입품목','투입품목명','단위','입고일자'];
    const lines = rows.map((r) => [
      r.CHECK ? 'Y' : 'N',
      r.ITEM_CD ?? '',
      r.ITEM_NM ?? '',
      r.UNIT_CD ?? '',
      r.PO_YMD ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM04007S.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">제품투입품목 조회</div>

      {/* Buttons */}
      <div className="flex gap-2 justify-end">
        <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
        <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Grid */}
      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-12 p-2 text-center">선택</th>
              <th className="w-28 p-2 text-center">투입품목</th>
              <th className="p-2 text-left">투입품목명</th>
              <th className="w-24 p-2 text-center">단위</th>
              <th className="w-28 p-2 text-center">입고일자</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggle(i, e.target.checked)} /></td>
                <td className="p-2 text-center">{r.ITEM_CD ?? ''}</td>
                <td className="p-2 text-left">{r.ITEM_NM ?? ''}</td>
                <td className="p-2 text-center">{r.UNIT_CD ?? ''}</td>
                <td className="p-2 text-center">{r.PO_YMD ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조회를 눌러 가져오세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
