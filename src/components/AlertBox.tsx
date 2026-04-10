import type { ReactNode } from 'react';

type AlertBoxProps = {
  children: ReactNode;
  tone?: 'error' | 'warning';
  className?: string;
};

const toneClassNames = {
  error: 'rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive',
  warning: 'space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900',
};

export default function AlertBox({ children, tone = 'error', className }: AlertBoxProps) {
  return <div className={className ?? toneClassNames[tone]}>{children}</div>;
}
