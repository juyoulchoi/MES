import type { ReactNode } from 'react';

type SectionHeaderProps = {
  title: string;
  right?: ReactNode;
};

export default function SectionHeader({ title, right }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {right}
    </div>
  );
}
