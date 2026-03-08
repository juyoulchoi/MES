import { useEffect, useMemo, useState } from 'react';
import { http } from '@/lib/http';
import { BaseTable, type TableColumn } from '@/components/table/BaseTable';

// 제품출고 지시현황 (MMSM04001S)
// 필터: 출고일자(시작/끝)
// 기능: 조회, 엑셀(CSV)
// 컬럼: 순번, 출고일자(GI_DT), 수주일자(SO_YMD), 품명(ITEM_NM), 거래처명(CST_NM), 계획수량(SO_QTY), 출고수량(GI_QTY), 잔량(REM_QTY?), 출고지시일, 출고요청일, 출고일

type Row = Record<string, any>;

function fmtDateYMD(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, '0');
  const day = `${dt.getDate()}`.padStart(2, '0');
  return `${y}${m}${day}`;
}

export default function MMSM04001S() {
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Init today for both dates
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = `${today.getMonth() + 1}`.padStart(2, '0');
    const dd = `${today.getDate()}`.padStart(2, '0');
    const ymd = `${yyyy}-${mm}-${dd}`;
    setStartDate(ymd);
    setEndDate(ymd);
  }, []);

  async function onSearch() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        start: fmtDateYMD(startDate),
        end: fmtDateYMD(endDate),
      }).toString();
      const data = await http<Row[]>(`/api/m04/mmsm04001/list?${qs}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onExportCsv() {
    const headers = [
      '순번',
      '출고일자',
      '수주일자',
      '품명',
      '거래처명',
      '계획수량',
      '출고수량',
      '잔량',
      '출고지시일',
      '출고요청일',
      '출고일',
    ];
    const lines = rows.map((r, i) =>
      [
        r.RNUM ?? i + 1,
        r.GI_DT ?? '',
        r.SO_YMD ?? '',
        r.ITEM_NM ?? '',
        r.CST_NM ?? '',
        r.SO_QTY ?? '',
        r.GI_QTY ?? '',
        r.REM_QTY ?? r.BAL_QTY ?? r.REMAIN_QTY ?? r.GI_QTY ?? '',
        r.SO_INS_YMD ?? r.SO_YMD ?? '',
        r.SO_REQ_YMD ?? r.SO_YMD ?? '',
        r.GI_DAY ?? r.GI_DT ?? '',
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
    a.download = 'MMSM04001S.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const columns = useMemo<TableColumn<Row>[]>(
    () => [
      {
        key: 'RNUM',
        header: '순번',
        align: 'center',
        width: 64,
        accessor: (r, i) => r.RNUM ?? i + 1,
      },
      { key: 'GI_DT', header: '출고일자', align: 'center', width: 112, accessor: 'GI_DT' },
      { key: 'SO_YMD', header: '수주일자', align: 'center', width: 112, accessor: 'SO_YMD' },
      { key: 'ITEM_NM', header: '품명', align: 'left', accessor: 'ITEM_NM' },
      { key: 'CST_NM', header: '거래처명', align: 'left', width: 160, accessor: 'CST_NM' },
      { key: 'SO_QTY', header: '계획수량', align: 'right', width: 96, accessor: 'SO_QTY' },
      { key: 'GI_QTY', header: '출고수량', align: 'right', width: 96, accessor: 'GI_QTY' },
      {
        key: 'REM_QTY',
        header: '잔량',
        align: 'right',
        width: 96,
        accessor: (r) => r.REM_QTY ?? r.BAL_QTY ?? r.REMAIN_QTY ?? r.GI_QTY ?? '',
      },
      {
        key: 'SO_INS_YMD',
        header: '출고지시일',
        align: 'center',
        width: 112,
        accessor: (r) => r.SO_INS_YMD ?? r.SO_YMD ?? '',
      },
      {
        key: 'SO_REQ_YMD',
        header: '출고요청일',
        align: 'center',
        width: 112,
        accessor: (r) => r.SO_REQ_YMD ?? r.SO_YMD ?? '',
      },
      {
        key: 'GI_DAY',
        header: '출고일',
        align: 'center',
        width: 112,
        accessor: (r) => r.GI_DAY ?? r.GI_DT ?? '',
      },
    ],
    []
  );

  const tableClassNames = useMemo(
    () => ({
      wrapper: 'border rounded overflow-auto max-h-[70vh]',
      table: 'w-full text-sm',
      thead: 'sticky top-0 bg-background',
      headerRow: 'border-b',
      headerCell: 'p-2',
      bodyRow: 'border-b hover:bg-muted/30',
      bodyCell: 'p-2',
      emptyCell: 'p-3 text-center text-muted-foreground',
    }),
    []
  );

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">제품출고 지시현황</div>

      {/* Filters & Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">출고일자(시작)</span>
          <input
            type="date"
            className="h-8 border rounded px-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">출고일자(끝)</span>
          <input
            type="date"
            className="h-8 border rounded px-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <div className="flex gap-2 md:col-span-2 justify-end">
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
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 rounded p-2">
          {error}
        </div>
      )}

      {/* Grid */}
      <BaseTable
        rows={rows}
        columns={columns}
        rowKey={(row, i) => row.RNUM ?? i}
        classNames={tableClassNames}
        emptyText="데이터가 없습니다. 조건을 선택하고 조회하세요."
      />
    </div>
  );
}
