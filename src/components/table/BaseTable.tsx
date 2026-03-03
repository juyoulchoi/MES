import type { ReactNode } from 'react';

type Align = 'left' | 'center' | 'right';

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
      className={
        'py-2 px-2 text-gray-700 text-xs font-semibold border-b ' +
        (className ?? '')
      }
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
    <td
      className={'py-2 px-2 ' + (className ?? '')}
      colSpan={colSpan}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
}
