import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 호기 정보 조회 (라인/호기 선택 팝업) - MMSM08005S
// 필터: 없음 (ASPX 기준)
// 기능: 자동 조회, 행 클릭 or 확인 버튼으로 선택 반환, 엑셀 내보내기

type Row = {
  LINE_CD?: string;
  LINE_NM?: string;
  [k: string]: any;
};

export default function MMSM08005S() {
  const lineCode = '호기코드';
  const lineName = '호기명';
  const useStatus = 'Active';

  const [rows, setRows] = useState<Row[]>([]);
  const [focused, setFocused] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineCd, setLineCd] = useState('');

  useEffect(() => {
    onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/v1/common/line/search`;
      const data = await http<Row[]>(url);
      const list = (Array.isArray(data) ? data : []).map((r) => ({
        LINE_CD: r.LINE_CD ?? '',
        LINE_NM: r.LINE_NM ?? '',
      }));

      setRows(list);
      setFocused(list.length > 0 ? 0 : -1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onRowClick(i: number) {
    setFocused(i);
    if (i >= 0) emitSelection(rows[i]);
  }

  function emitSelection(r?: Row) {
    if (!r) return;
    // ASPX는 PROC_CD/PROC_NM 키로 상위에 전달
    const payload = {
      PROC_CD: r.LINE_CD ?? '',
      PROC_NM: r.LINE_NM ?? '',
    };
    // CustomEvent for same-window listeners
    try {
      window.dispatchEvent(
        new CustomEvent('picker:select', { detail: payload })
      );
    } catch {}
    // postMessage for opener/parent contexts
    try {
      window.opener &&
        window.opener.postMessage({ type: 'MMSM08005S_SELECT', payload }, '*');
    } catch {}
    try {
      window.parent &&
        window.parent !== window &&
        window.parent.postMessage({ type: 'MMSM08005S_SELECT', payload }, '*');
    } catch {}
  }

  function onConfirm() {
    if (focused >= 0) emitSelection(rows[focused]);
  }

  function onExportCsv() {
    const headers = ['No.', '호기코드', '호기명'];
    const lines = rows.map((r, i) =>
      [(i + 1).toString(), r.LINE_CD ?? '', r.LINE_NM ?? '']
        .map((v) => (v ?? '').toString().replace(/"/g, '""'))
        .map((v) => `"${v}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM08005S_lines.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3" style={{ width: 640 }}>
      <div className="text-base font-semibold">호기 정보 조회</div>

      {/* Buttons (ASPX엔 조회 버튼 없음, 자동조회) */}
      <div className="flex gap-2 justify-end">
        <button onClick={onExportCsv} className="h-8 px-3 border rounded">
          엑셀
        </button>
        <button
          onClick={onConfirm}
          disabled={focused < 0}
          className="h-8 px-3 border rounded"
        >
          확인
        </button>
      </div>

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 rounded p-2">
          {error}
        </div>
      )}

      {/* Grid */}
      <div
        className="border rounded overflow-auto max-h-[70vh]"
        style={{ height: 320 }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-12 p-2 text-center">No.</th>
              <th className="w-40 p-2 text-center">{lineCode}</th>
              <th className="w-56 p-2 text-left">{lineName}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={`border-b hover:bg-muted/30 cursor-pointer ${
                  focused === i ? 'bg-muted/40' : ''
                }`}
                onClick={() => onRowClick(i)}
              >
                <td className="p-2 text-center">{i + 1}</td>
                <td className="p-2 text-center">{r.LINE_CD ?? ''}</td>
                <td className="p-2 text-left">{r.LINE_NM ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="p-3 text-center text-muted-foreground"
                >
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
