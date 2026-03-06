import type { CSSProperties, ReactNode } from 'react';

type Align = 'left' | 'center' | 'right';

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  accessor?: keyof T | ((row: T, rowIndex: number) => ReactNode);
  render?: (row: T, rowIndex: number) => ReactNode;
  align?: Align;
  width?: string | number;
  headerClassName?: string;
  cellClassName?: string | ((row: T, rowIndex: number) => string | undefined);
  headerStyle?: CSSProperties;
  cellStyle?: CSSProperties | ((row: T, rowIndex: number) => CSSProperties | undefined);
}

export interface BaseTableClassNames {
  wrapper?: string;
  table?: string;
  thead?: string;
  headerRow?: string;
  headerCell?: string;
  tbody?: string;
  bodyRow?: string | ((rowIndex: number) => string | undefined);
  bodyCell?: string;
  emptyRow?: string;
  emptyCell?: string;
}

export interface BaseTableProps<T> {
  rows: T[];
  columns: TableColumn<T>[];
  rowKey?: keyof T | ((row: T, rowIndex: number) => string | number);
  emptyText?: ReactNode;
  emptyColSpan?: number;
  classNames?: BaseTableClassNames;
}

function toClassName(value?: string | null) {
  return value ?? '';
}

function resolveRowKey<T>(row: T, rowIndex: number, rowKey?: BaseTableProps<T>['rowKey']) {
  if (typeof rowKey === 'function') return rowKey(row, rowIndex);
  if (rowKey) return row[rowKey] as string | number;
  return rowIndex;
}

function resolveCellValue<T>(column: TableColumn<T>, row: T, rowIndex: number) {
  if (column.render) return column.render(row, rowIndex);
  if (typeof column.accessor === 'function') return column.accessor(row, rowIndex);
  if (column.accessor) return row[column.accessor] as ReactNode;
  return null;
}

function resolveWidthStyle(width?: string | number): CSSProperties | undefined {
  if (width === undefined) return undefined;
  return { width: typeof width === 'number' ? `${width}px` : width };
}

export function BaseTable<T>({
  rows,
  columns,
  rowKey,
  emptyText = '데이터가 없습니다.',
  emptyColSpan,
  classNames,
}: BaseTableProps<T>) {
  const colSpan = emptyColSpan ?? columns.length;

  return (
    <div className={classNames?.wrapper}>
      <table className={classNames?.table}>
        <thead className={classNames?.thead}>
          <tr className={classNames?.headerRow}>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`${toClassName(classNames?.headerCell)} ${toClassName(column.headerClassName)}`.trim()}
                style={{
                  textAlign: column.align ?? 'center',
                  ...resolveWidthStyle(column.width),
                  ...(column.headerStyle ?? {}),
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={classNames?.tbody}>
          {rows.map((row, rowIndex) => (
            <tr
              key={resolveRowKey(row, rowIndex, rowKey)}
              className={
                typeof classNames?.bodyRow === 'function'
                  ? classNames.bodyRow(rowIndex)
                  : classNames?.bodyRow
              }
            >
              {columns.map((column) => {
                const cellClassName =
                  typeof column.cellClassName === 'function'
                    ? column.cellClassName(row, rowIndex)
                    : column.cellClassName;
                const cellStyle =
                  typeof column.cellStyle === 'function'
                    ? column.cellStyle(row, rowIndex)
                    : column.cellStyle;

                return (
                  <td
                    key={column.key}
                    className={`${toClassName(classNames?.bodyCell)} ${toClassName(cellClassName)}`.trim()}
                    style={{ textAlign: column.align ?? 'left', ...(cellStyle ?? {}) }}
                  >
                    {resolveCellValue(column, row, rowIndex)}
                  </td>
                );
              })}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr className={classNames?.emptyRow}>
              <td colSpan={colSpan} className={classNames?.emptyCell}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  w,
  align = 'center',
  className,
}: {
  children: ReactNode;
  w?: string | number;
  align?: Align;
  className?: string;
}) {
  return (
    <th
      className={'py-2 px-2 text-gray-700 text-xs font-semibold border-b ' + (className ?? '')}
      style={{ width: typeof w === 'number' ? `${w}px` : w, textAlign: align }}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  colSpan,
  align = 'left',
  className,
}: {
  children: ReactNode;
  colSpan?: number;
  align?: Align;
  className?: string;
}) {
  return (
    <td className={'py-2 px-2 ' + (className ?? '')} colSpan={colSpan} style={{ textAlign: align }}>
      {children}
    </td>
  );
}
