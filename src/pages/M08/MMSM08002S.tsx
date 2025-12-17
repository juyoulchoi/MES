import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 정보 조회 (원자재 선택 팝업 성격) - MMSM08002S
// 필터: ITEM_NM, ITEM_CD
// 기능: 조회, 행 클릭 or 확인 버튼으로 선택 반환, 엑셀(Optional)

type Row = {
  RNUM?: number | string;
  ITEM_CD?: string;
  ITEM_NM?: string;
  ITEM_TP?: string;
  WID?: string | number;
  HGT?: string | number;
  PRT_CNT?: string | number;
  UNIT_CD?: string;
  [k: string]: any;
};

export default function MMSM08002S() {
  // Filters
  const [itemCd, setItemCd] = useState('');
  const [itemNm, setItemNm] = useState('');
  const [typecode, setTypecode] = useState('');
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

      if (itemCd) params.set('item_cd', itemCd);
      if (itemNm) params.set('item_nm', itemNm);

      setTypecode(params.get('typecode'));
      setTitle(params.get('title'));

      if (typecode === 'product') {
        setCaptionCode('제품코드');
        setCaptionName('제품명');
      } else {
        setCaptionCode('원자재코드');
        setCaptionName('원자재명');
      }

      const url =
        `/api/m08/mmsm08002/search` +
        (params.toString() ? `?${params.toString()}` : '');

      const data = await http<Row[]>(url);
      const list = (Array.isArray(data) ? data : []).map((r, i) => ({
        RNUM: r.RNUM ?? i + 1,
        ITEM_CD: r.ITEM_CD ?? '',
        ITEM_NM: r.ITEM_NM ?? '',
        ITEM_TP: r.ITEM_TP ?? '',
        WID: r.WID ?? '',
        HGT: r.HGT ?? '',
        PRT_CNT: r.PRT_CNT ?? '',
        UNIT_CD: r.UNIT_CD ?? '',
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
      ITEM_CD: r.ITEM_CD ?? '',
      ITEM_NM: r.ITEM_NM ?? '',
      ITEM_TP: r.ITEM_TP ?? '',
      WID: r.WID ?? '',
      HGT: r.HGT ?? '',
      UNIT_CD: r.UNIT_CD ?? '',
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
        window.opener.postMessage({ type: 'MMSM08002S_SELECT', payload }, '*');
    } catch {}
    try {
      window.parent &&
        window.parent !== window &&
        window.parent.postMessage({ type: 'MMSM08002S_SELECT', payload }, '*');
    } catch {}
  }

  function onConfirm() {
    if (focused >= 0) emitSelection(rows[focused]);
  }

  function onExportCsv() {
    const headers = [
      'No.',
      '원자재코드',
      '원자재명',
      '종류',
      '가로',
      '세로',
      '도수',
      '단위',
    ];
    const lines = rows.map((r, i) =>
      [
        r.RNUM ?? i + 1,
        r.ITEM_CD ?? '',
        r.ITEM_NM ?? '',
        r.ITEM_TP ?? '',
        r.WID ?? '',
        r.HGT ?? '',
        r.PRT_CNT ?? '',
        r.UNIT_CD ?? '',
      ]
        .map((v) => (v ?? '').toString().replace(/"/g, '""'))
        .map((v) => `"${v}"`)
        .join(',')
    );
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MMSM08002S_items.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">{title}</div>

      {/* Filters & Buttons */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">{captionName}</span>
          <input
            className="h-8 border rounded px-2 w-48"
            value={itemNm}
            onChange={(e) => setItemNm(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">{captionCode}</span>
          <input
            className="h-8 border rounded px-2 w-40"
            value={itemCd}
            onChange={(e) => setItemCd(e.target.value)}
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
      <div className="border rounded overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-12 p-2 text-center">No.</th>
              <th className="w-28 p-2 text-center">{captionCode}</th>
              <th className="w-44 p-2 text-left">{captionName}</th>
              <th className="w-24 p-2 text-center">종류</th>
              <th className="w-24 p-2 text-center">가로</th>
              <th className="w-24 p-2 text-center">세로</th>
              <th className="w-20 p-2 text-center">도수</th>
              <th className="w-20 p-2 text-center">단위</th>
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
                <td className="p-2 text-center">{r.ITEM_CD ?? ''}</td>
                <td className="p-2 text-left">{r.ITEM_NM ?? ''}</td>
                <td className="p-2 text-center">{r.ITEM_TP ?? ''}</td>
                <td className="p-2 text-center">{r.WID ?? ''}</td>
                <td className="p-2 text-center">{r.HGT ?? ''}</td>
                <td className="p-2 text-center">{r.PRT_CNT ?? ''}</td>
                <td className="p-2 text-center">{r.UNIT_CD ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
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
