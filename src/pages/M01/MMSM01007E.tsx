import { useState } from 'react';
import { http } from '@/lib/http';

// 원자재 재고조정 (MMSM01007E)
// 필터: 원자재 코드, 원자재 명
// 버튼: 조회, 저장, 엑셀(CSV)
// 컬럼: 순번, 원자재코드, 원자재명, 원자재구분, 종류, 규격, 재고수량, 실사량(편집), 조정량(편집), 조정사유(편집)

type Row = Record<string, any> & {
  CHECK?: boolean;
  REAL_QTY?: number | string; // 실사량
  ADJ_QTY?: number | string; // 조정량
  DESC?: string; // 조정사유
};

export default function MMSM01007E() {
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
      const data = await http<Row[]>(`/api/m01/mmsm01007/list?${qs}`);
      const list = (Array.isArray(data) ? data : []).map((r, i) => ({
        ...r,
        CHECK: false,
        RNUM: r.RNUM ?? i + 1,
        REAL_QTY: r.REAL_QTY ?? '',
        ADJ_QTY: r.ADJ_QTY ?? '',
        DESC: r.DESC ?? '',
      }));
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function markChanged(i: number, patch: Partial<Row>) {
    setRows(prev => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch, CHECK: true };
      return next;
    });
  }

  async function onSave() {
    const targets = rows.filter(r => r.CHECK);
    if (targets.length === 0) {
      setError('저장할 데이터가 없습니다.');
      return;
    }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      const payload = targets.map(r => ({
        ITEM_CD: r.ITEM_CD ?? r.PO_YMD_SEQ ?? '',
        ITEM_NM: r.ITEM_NM ?? '',
        ITEM_GB: r.ITEM_GB ?? '',
        ITEM_TP: r.ITEM_TP ?? '',
        STANDARD: r.STANDARD ?? '',
        STOCK_QTY: r.STOCK_QTY ?? r.QTY ?? '',
        REAL_QTY: r.REAL_QTY ?? '',
        ADJ_QTY: r.ADJ_QTY ?? '',
        DESC: r.DESC ?? '',
        METHOD: 'Y' as const,
      }));
      await http(`/api/m01/mmsm01007/save`, { method: 'POST', body: payload });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const headers = ['순번','원자재코드','원자재명','원자재구분','종류','규격','재고수량','실사량','조정량','조정사유'];
    const lines = rows.map((r, i) => {
      const code = r.ITEM_CD ?? r.PO_YMD_SEQ ?? '';
      const stock = r.STOCK_QTY ?? r.QTY ?? '';
      return [
        r.RNUM ?? i + 1,
        code,
        r.ITEM_NM ?? '',
        r.ITEM_GB ?? '',
        r.ITEM_TP ?? '',
        r.STANDARD ?? '',
        stock,
        r.REAL_QTY ?? '',
        r.ADJ_QTY ?? '',
        r.DESC ?? '',
      ].map(v => (v ?? '').toString().replaceAll('"', '""'))
        .map(v => `"${v}` + `"`).join(',');
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM01007E.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">원자재 재고조정</div>

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
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
          <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
        </div>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Grid with editable columns */}
      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-16 p-2 text-center">순번</th>
              <th className="w-28 p-2 text-center">원자재코드</th>
              <th className="p-2 text-center">원자재명</th>
              <th className="w-24 p-2 text-center">원자재구분</th>
              <th className="w-32 p-2 text-left">종류</th>
              <th className="w-28 p-2 text-center">규격</th>
              <th className="w-24 p-2 text-right">재고수량</th>
              <th className="w-24 p-2 text-right">실사량</th>
              <th className="w-24 p-2 text-right">조정량</th>
              <th className="w-60 p-2 text-left">조정사유</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const code = r.ITEM_CD ?? r.PO_YMD_SEQ ?? '';
              const stock = r.STOCK_QTY ?? r.QTY ?? '';
              return (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="p-2 text-center">{r.RNUM ?? i + 1}</td>
                  <td className="p-2 text-center">{code}</td>
                  <td className="p-2 text-center">{r.ITEM_NM ?? ''}</td>
                  <td className="p-2 text-center">{r.ITEM_GB ?? ''}</td>
                  <td className="p-2">{r.ITEM_TP ?? ''}</td>
                  <td className="p-2 text-center">{r.STANDARD ?? ''}</td>
                  <td className="p-2 text-right">{stock}</td>
                  <td className="p-1 text-right">
                    <input
                      className="h-8 border rounded px-2 w-full text-right"
                      value={r.REAL_QTY ?? ''}
                      onChange={e => markChanged(i, { REAL_QTY: e.target.value })}
                    />
                  </td>
                  <td className="p-1 text-right">
                    <input
                      className="h-8 border rounded px-2 w-full text-right"
                      value={r.ADJ_QTY ?? ''}
                      onChange={e => markChanged(i, { ADJ_QTY: e.target.value })}
                    />
                  </td>
                  <td className="p-1">
                    <input
                      className="h-8 border rounded px-2 w-full"
                      value={r.DESC ?? ''}
                      onChange={e => markChanged(i, { DESC: e.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
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
