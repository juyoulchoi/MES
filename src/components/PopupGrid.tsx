import type { HTMLAttributes } from 'react';
import { BaseTable, type BaseTableClassNames, type TableColumn } from '@/components/table/BaseTable';
import type { PageResult } from '@/lib/pagination';

const popupGridClassNames: BaseTableClassNames = {
  wrapper: 'overflow-auto px-4 pb-4 pt-4',
  table: 'w-full text-sm',
  thead: 'sticky top-0 bg-gray-50',
  headerCell: 'px-2 py-2 text-left text-xs font-semibold text-gray-700 border-b',
  bodyRow: 'border-t hover:bg-gray-50',
  bodyCell: 'px-2 py-2',
  emptyCell: 'px-2 py-8 text-center text-sm text-gray-400',
  paginationBar: 'flex items-center justify-between border-t px-4 py-3 text-sm text-gray-600',
  paginationControls: 'flex items-center gap-2',
  paginationButton: 'rounded border px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50',
};

type PopupGridProps<T> = {
  result: PageResult<T>;
  columns: TableColumn<T>[];
  rowKey: keyof T | ((row: T, rowIndex: number) => string | number);
  emptyText: string;
  loading?: boolean;
  onPageChange?: (page: number) => void;
  getRowProps?: (row: T, rowIndex: number) => HTMLAttributes<HTMLTableRowElement>;
};

export default function PopupGrid<T>({
  result,
  columns,
  rowKey,
  emptyText,
  loading,
  onPageChange,
  getRowProps,
}: PopupGridProps<T>) {
  return (
    <BaseTable
      pageResult={result}
      columns={columns}
      rowKey={rowKey}
      getRowProps={getRowProps}
      emptyText={emptyText}
      classNames={popupGridClassNames}
      pagination={
        onPageChange
          ? {
              result,
              loading,
              onPageChange,
            }
          : undefined
      }
    />
  );
}
