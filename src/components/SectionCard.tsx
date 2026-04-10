import type { ReactNode } from 'react';

type SectionCardSpan = 'full' | 'left' | 'right';
type SectionCardWidth = 'auto' | 'full';
type SectionCardPadding = 'none' | 'md';

type SectionCardProps = {
  children: ReactNode;
  span?: SectionCardSpan;
  width?: SectionCardWidth;
  padding?: SectionCardPadding;
};

const spanClassNames: Record<SectionCardSpan, string> = {
  full: 'col-span-12',
  left: 'col-span-12 md:col-span-4',
  right: 'col-span-12 md:col-span-7',
};

const widthClassNames: Record<SectionCardWidth, string> = {
  auto: '',
  full: 'w-full',
};

const paddingClassNames: Record<SectionCardPadding, string> = {
  none: '',
  md: 'p-4',
};

export default function SectionCard({
  children,
  span = 'full',
  width = 'auto',
  padding = 'none',
}: SectionCardProps) {
  const baseClassName = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

  return (
    <div
      className={[
        baseClassName,
        spanClassNames[span],
        widthClassNames[width],
        paddingClassNames[padding],
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
