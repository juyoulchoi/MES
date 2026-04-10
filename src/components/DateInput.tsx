type DateInputProps = {
  value: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
};

export default function DateInput({ value, onChange, min, max, className }: DateInputProps) {
  const baseClassName = 'h-8 w-full rounded border border-slate-200 px-2 text-center';

  return (
    <input
      type="date"
      className={className ?? baseClassName}
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}
