import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 정보 조회 (거래처 선택 팝업) - MMSM08003S
// 필터: CST_CD(거래처코드), CST_NM(거래처명)
// 기능: 조회, 행 클릭 or 확인 버튼으로 선택 반환, 엑셀 내보내기

type Row = {
  RNUM?: number | string;
  CST_CD?: string;
  CST_NM?: string;
  [k: string]: any;
};

export default function MMSM08003S() {
  // Filters
  const [cstCd, setCstCd] = useState('');
  const [cstNm, setCstNm] = useState('');
  const [typeCode, setTypeCode] = useState('');
  const [title, setTitle] = useState('');
  const [captionCode, setCaptionCode] = useState('');
  const [captionName, setCaptionName] = useState('');

  // Data & UI
  const [rows, setRows] = useState<Row[]>([]);
  const [focused, setFocused] = useState<number>(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 초기 진입 시 자동 조회는 보류
  }, []);

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (cstCd) params.set('cst_cd', cstCd);
      if (cstNm) params.set('cst_nm', cstNm);

      setTypeCode(params.get('typecode'));
      setTitle(params.get('title'));

      if (typeCode === 'customer') {
        
        setCaptionCode('고객사ID');
        setCaptionName('고객사명');
      } else {
        setCaptionCode('원자재 업체ID');
        setCaptionName('원자재 업체명');
      }

      const url =
        `/api/v1/mdm/cust/search` +
        (params.toString() ? `?${params.toString()}` : '');
      const data = await http<Row[]>(url);
      const list = (Array.isArray(data) ? data : []).map((r, i) => ({
        RNUM: r.RNUM ?? i + 1,
        CST_CD: r.CST_CD ?? '',
        CST_NM: r.CST_NM ?? '',
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
    const payload = {
      CST_CD: r.CST_CD ?? '',
      CST_NM: r.CST_NM ?? '',
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
        window.opener.postMessage({ type: 'MMSM08003S_SELECT', payload }, '*');
    } catch {}
    try {
      window.parent &&
        window.parent !== window &&
        window.parent.postMessage({ type: 'MMSM08003S_SELECT', payload }, '*');
    } catch {}
  }

  function onConfirm() {
    if (focused >= 0) emitSelection(rows[focused]);
  }

  function onExportCsv() {
    const headers = ['No.', '고객사ID', '고객사명'];
    const lines = rows.map((r, i) =>
      [r.RNUM ?? i + 1, r.CST_CD ?? '', r.CST_NM ?? '']
        .map((v) => (v ?? '').toString().replace(/"/g, '""'))
        .map((v) => `"${v}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM08003S_customers.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3" style={{ width: 640 }}>
      <div className="text-base font-semibold">{title}</div>

      {/* Filters & Buttons */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">{captionCode}</span>
          <input
            className="h-8 border rounded px-2 w-48"
            value={cstCd}
            onChange={(e) => setCstCd(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">{captionName}</span>
          <input
            className="h-8 border rounded px-2 w-48"
            value={cstNm}
            onChange={(e) => setCstNm(e.target.value)}
          />
        </label>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onSearch}
            disabled={loading}
            className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50"
          >
            조회
          </button>
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
              <th className="w-40 p-2 text-center">{captionCode}</th>
              <th className="w-56 p-2 text-left">{captionName}</th>
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
                <td className="p-2 text-center">{r.RNUM ?? i + 1}</td>
                <td className="p-2 text-center">{r.CST_CD ?? ''}</td>
                <td className="p-2 text-left">{r.CST_NM ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="p-3 text-center text-muted-foreground"
                >
                  데이터가 없습니다. 조건을 입력하고 조회하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
