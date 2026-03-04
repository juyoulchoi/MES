type FromToDateSearchFieldProps = {
  label: string;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
};

export default function FromToDateSearchField({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
}: FromToDateSearchFieldProps) {
  const hasRange = Boolean(fromValue && toValue);
  const isRangeInvalid = hasRange && fromValue > toValue;
  const inputBaseClass = 'h-9 w-[150px] rounded-lg border px-2';
  const inputErrorClass = isRangeInvalid ? 'border-red-500 bg-red-50' : '';

  return (
    <div className="w-[450px]">
      <div className="grid grid-cols-[100px_150px_30px_150px] items-center gap-2">
        <label className="text-sm text-gray-600">{label}</label>
        <input
          type="date"
          value={fromValue}
          max={toValue || undefined}
          onChange={(e) => onFromChange(e.target.value)}
          className={`${inputBaseClass} ${inputErrorClass}`}
        />
        <div className="text-center text-sm text-gray-600">~</div>
        <input
          type="date"
          value={toValue}
          min={fromValue || undefined}
          onChange={(e) => onToChange(e.target.value)}
          className={`${inputBaseClass} ${inputErrorClass}`}
        />
      </div>

      {isRangeInvalid && (
        <p className="mt-1 text-xs text-red-600">시작일은 종료일보다 클 수 없습니다.</p>
      )}
    </div>
  );
}
