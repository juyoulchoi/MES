import { useMemo, useState } from 'react';
import { BaseTable, tableClassNames, type BaseTableClassNames, type TableColumn } from '@/components/table/BaseTable';
import { gridCellClassNames, renderGridInputCell } from '@/components/table/GridCells';
import { http } from '@/lib/http';

type Row = Record<string, unknown> & {
  CHECK?: boolean;
  REAL_QTY?: number | string;
  ADJ_QTY?: number | string;
  DESC?: string;
};

export default function MMSM01007E() {
  const [itemCd, setItemCd] = useState('');
  const [itemNm, setItemNm] = useState('');

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gridClassNames = useMemo<BaseTableClassNames>(
    () => ({
      ...tableClassNames,
      wrapper: '',
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

  const columns = useMemo<TableColumn<Row>[]>(
    () => [
      { key: 'RNUM', header: '순번', width: 64, align: 'center', accessor: 'RNUM' },
      { key: 'ITEM_CD', header: '원자재코드', width: 112, align: 'center', accessor: 'ITEM_CD' },
      { key: 'ITEM_NM', header: '원자재명', accessor: 'ITEM_NM' },
      { key: 'ITEM_GB', header: '원자재구분', width: 96, align: 'center', accessor: 'ITEM_GB' },
      { key: 'ITEM_TP', header: '종류', width: 128, align: 'left', accessor: 'ITEM_TP' },
      { key: 'STANDARD', header: '규격', width: 112, align: 'center', accessor: 'STANDARD' },
      { key: 'STOCK_QTY', header: '재고수량', width: 96, align: 'right', accessor: 'STOCK_QTY' },
      {
        key: 'REAL_QTY',
        header: '실사량',
        width: 96,
        align: 'right',
        cellClassName: gridCellClassNames.editableRight,
        render: (row, rowIndex) =>
          renderGridInputCell({
            value: row.REAL_QTY,
            align: 'right',
            onChange: (e) => markChanged(rowIndex, { REAL_QTY: e.target.value }),
          }),
      },
      {
        key: 'ADJ_QTY',
        header: '조정량',
        width: 96,
        align: 'right',
        cellClassName: gridCellClassNames.editableRight,
        render: (row, rowIndex) =>
          renderGridInputCell({
            value: row.ADJ_QTY,
            align: 'right',
            onChange: (e) => markChanged(rowIndex, { ADJ_QTY: e.target.value }),
          }),
      },
      {
        key: 'DESC',
        header: '조정사유',
        width: 240,
        align: 'left',
        cellClassName: gridCellClassNames.editable,
        render: (row, rowIndex) =>
          renderGridInputCell({
            value: row.DESC,
            onChange: (e) => markChanged(rowIndex, { DESC: e.target.value }),
          }),
      },
    ],
    []
  );

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
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch, CHECK: true };
      return next;
    });
  }

  async function onSave() {
    const targets = rows.filter((r) => r.CHECK);
    if (targets.length === 0) {
      setError('저장할 데이터가 없습니다.');
      return;
    }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true);
    setError(null);
    try {
      const payload = targets.map((r) => ({
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
    const headers = [
      '순번',
      '원자재코드',
      '원자재명',
      '원자재구분',
      '종류',
      '규격',
      '재고수량',
      '실사량',
      '조정량',
      '조정사유',
    ];
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
      ]
        .map((v) => (v ?? '').toString())
        .map((v) => `"${v}"`)
        .join(',');
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
        <label className="flex flex-col text-sm">
          <span className="mb-1">원자재 코드</span>
          <input
            className="h-8 border rounded px-2"
            value={itemCd}
            onChange={(e) => setItemCd(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-sm md:col-span-2">
          <span className="mb-1">원자재 명</span>
          <input
            className="h-8 border rounded px-2"
            value={itemNm}
            onChange={(e) => setItemNm(e.target.value)}
          />
        </label>
        <div className="flex gap-2 md:col-span-3 justify-end">
          <button
            onClick={onSearch}
            disabled={loading}
            className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50"
          >
            조회
          </button>
          <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">
            저장
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

      <div className="border rounded overflow-auto max-h-[70vh]">
        <BaseTable
          rows={rows}
          columns={columns}
          rowKey={(row, index) => `${row.ITEM_CD ?? row.PO_YMD_SEQ ?? 'row'}-${index}`}
          classNames={gridClassNames}
          emptyText="데이터가 없습니다. 조건을 선택하고 조회하세요."
        />
      </div>
    </div>
  );
}


