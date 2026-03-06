import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { downloadTextFile, toCsvText, type CsvCell } from '@/lib/export';

export interface ExportCsvButtonProps<T>
  extends Omit<ButtonProps, 'onClick' | 'children' | 'disabled'> {
  rows: T[];
  headers: CsvCell[];
  mapRow: (row: T, index: number) => CsvCell[];
  filename: string | ((rows: T[]) => string);
  label?: React.ReactNode;
  disabled?: boolean;
}

export default function ExportCsvButton<T>({
  rows,
  headers,
  mapRow,
  filename,
  label = '엑셀',
  disabled,
  ...buttonProps
}: ExportCsvButtonProps<T>) {
  const handleExport = () => {
    if (!rows.length) return;
    const content = toCsvText([headers, ...rows.map(mapRow)]);
    const resolvedFilename = typeof filename === 'function' ? filename(rows) : filename;
    downloadTextFile(resolvedFilename, content);
  };

  return (
    <Button onClick={handleExport} disabled={disabled || rows.length === 0} {...buttonProps}>
      {label}
    </Button>
  );
}
