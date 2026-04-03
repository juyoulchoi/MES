import type { ChangeEvent, ReactElement, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type GridCellAlign = 'left' | 'center' | 'right';

export interface GridCellOption {
  value: string;
  label: ReactNode;
}

interface GridCellBaseOptions {
  className?: string;
  align?: GridCellAlign;
}

interface GridInputCellOptions extends GridCellBaseOptions {
  value: string | number | null | undefined;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

interface GridSelectCellOptions extends GridCellBaseOptions {
  value: string | number | null | undefined;
  options: GridCellOption[];
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  placeholder?: ReactNode;
}

export const gridCellClassNames = {
  editable: 'p-1',
  editableRight: 'p-1 text-right',
  editableCenter: 'p-1 text-center',
};

function resolveAlignClass(align?: GridCellAlign) {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

function resolveValue(value: string | number | null | undefined) {
  return value ?? '';
}

export function renderGridReadOnlyCell(
  value: string | number | null | undefined,
  options?: GridCellBaseOptions
): ReactElement {
  return (
    <Input
      value={resolveValue(value)}
      readOnly
      className={cn('h-8 bg-muted', resolveAlignClass(options?.align), options?.className)}
    />
  );
}

export function renderGridInputCell({
  value,
  onChange,
  className,
  align,
}: GridInputCellOptions): ReactElement {
  return (
    <Input
      value={resolveValue(value)}
      onChange={onChange}
      className={cn('h-8', resolveAlignClass(align), className)}
    />
  );
}

export function renderGridSelectCell({
  value,
  options,
  onChange,
  placeholder,
  className,
  align,
}: GridSelectCellOptions): ReactElement {
  return (
    <select
      value={resolveValue(value)}
      onChange={onChange}
      className={cn(
        'border-input h-8 w-full rounded-md border bg-transparent px-2 text-sm outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        resolveAlignClass(align),
        className
      )}
    >
      <option value="">{placeholder ?? ''}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
