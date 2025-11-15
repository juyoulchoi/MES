import { useState } from 'react';
import { http } from '@/lib/http';

// 원자재 투입 이력 현황 (MMSM01009S)
// 필터: 원자재 코드, 원자재 명
// 버튼: 조회, 엑셀(CSV)
// 컬럼: 순번, 제품명, 원자재명, 업체명, 등록일자

type Row = Record<string, any>;

export default function MMSM01009S() {
  // Filters
  const [itemCd, setItemCd] = useState('');
  const [itemNm, setItemNm] = useState('');

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ item_cd: itemCd || '', item_nm: itemNm || '' }).toString();
      const data = await http<Row[]>(`/api/m01/mmsm01009/list?${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const headers = ['순번','제품명','원자재명','업체명','등록일자'];
    const lines = rows.map((r, i) => [
      r.RNUM ?? i + 1,
      r.ITEM_NM ?? '',
      r.MAT_NM ?? '',
      r.CST_NM ?? '',
      r.REQ_YMD ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}` + `"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM01009S.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">원자재 투입 이력 현황</div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">원자재 코드</span>
          <input className="h-8 border rounded px-2" value={itemCd} onChange={(e) => setItemCd(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm md:col-span-2">
          <span className="mb-1">원자재 명</span>
          <input className="h-8 border rounded px-2" value={itemNm} onChange={(e) => setItemNm(e.target.value)} />
        </label>
        <div className="flex gap-2 md:col-span-3 justify-end">
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
              <th className="p-2 text-center">제품명</th>
              <th className="p-2 text-center">원자재명</th>
              <th className="w-40 p-2 text-center">업체명</th>
              <th className="w-28 p-2 text-center">등록일자</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center">{r.RNUM ?? i + 1}</td>
                <td className="p-2 text-center">{r.ITEM_NM ?? ''}</td>
                <td className="p-2 text-center">{r.MAT_NM ?? ''}</td>
                <td className="p-2 text-center">{r.CST_NM ?? ''}</td>
                <td className="p-2 text-center">{r.REQ_YMD ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 선택하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
