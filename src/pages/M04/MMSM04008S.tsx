import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '@/lib/http';

// 수주현황 (MMSM04008S)
// 필터: 수주일자 시작/끝, 거래처코드/명, 제품코드/명
// 버튼: 조회, 수주등록(페이지 이동), 엑셀
// 그리드: SO_NO, CST_NM, ITEM_NM, QTY, EM_NM, REQ_YMD (CST_CD, END_YN은 숨김 취급)

type Row = {
  SO_NO?: string;
  CST_CD?: string;
  CST_NM?: string;
  ITEM_NM?: string;
  QTY?: number | string;
  EM_NM?: string;
  END_YN?: string;
  REQ_YMD?: string;
  [k: string]: any;
};

function toYmd(v?: string) {
  if (!v) return '';
  return v.replace(/-/g, '');
}

export default function MMSM04008S() {
  const nav = useNavigate();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');
  const [itemCd, setItemCd] = useState('');
  const [itemNm, setItemNm] = useState('');

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (toYmd(startDate)) params.set('start_ymd', toYmd(startDate));
      if (toYmd(endDate)) params.set('end_ymd', toYmd(endDate));
      if (cstCd) params.set('cst_cd', cstCd);
      if (itemCd) params.set('item_cd', itemCd);
      const q = params.toString();
      const url = `/api/m04/mmsm04008/list` + (q ? `?${q}` : '');
      const data = await http<Row[]>(url);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['수주번호','거래처명','제품명','수량','긴급구분','등록일자'];
    const lines = rows.map((r) => [
      r.SO_NO ?? '',
      r.CST_NM ?? '',
      r.ITEM_NM ?? '',
      r.QTY ?? '',
      r.EM_NM ?? '',
      r.REQ_YMD ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM04008S.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">수주현황</div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">수주일자</span>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="h-8 px-2 border rounded" />
          <span>~</span>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="h-8 px-2 border rounded" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">거래처</span>
          <input placeholder="코드" value={cstCd} onChange={e=>setCstCd(e.target.value)} className="h-8 px-2 border rounded w-24" />
          <input placeholder="명" value={cstNm} onChange={e=>setCstNm(e.target.value)} className="h-8 px-2 border rounded w-40" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">제품</span>
          <input placeholder="코드" value={itemCd} onChange={e=>setItemCd(e.target.value)} className="h-8 px-2 border rounded w-24" />
          <input placeholder="명" value={itemNm} onChange={e=>setItemNm(e.target.value)} className="h-8 px-2 border rounded w-40" />
        </div>

        <div className="ml-auto flex gap-2">
          <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
          <button onClick={() => nav('/app/m02/MMSM02001E')} className="h-8 px-3 border rounded">수주등록</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Grid */}
      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-28 p-2 text-center">수주번호</th>
              <th className="w-40 p-2 text-left">거래처명</th>
              <th className="p-2 text-left">제품명</th>
              <th className="w-24 p-2 text-right">수량</th>
              <th className="w-24 p-2 text-center">긴급구분</th>
              <th className="w-28 p-2 text-center">등록일자</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center">{r.SO_NO ?? ''}</td>
                <td className="p-2 text-left">{r.CST_NM ?? ''}</td>
                <td className="p-2 text-left">{r.ITEM_NM ?? ''}</td>
                <td className="p-2 text-right">{r.QTY ?? ''}</td>
                <td className="p-2 text-center">{r.EM_NM ?? ''}</td>
                <td className="p-2 text-center">{r.REQ_YMD ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-center text-muted-foreground">데이터가 없습니다. 조건을 설정하고 조회하세요.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
