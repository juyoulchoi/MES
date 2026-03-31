type DateEditProps = {
  label: string;
  value: string;
};

export default function DateEdit({ label, value }: DateEditProps) {
  const inputBaseClass = 'h-9 w-[150px] rounded-lg border px-2';

  return (
    <div className="w-[450px]">
      <div className="grid grid-cols-[100px_150px_30px_150px] items-center gap-2">
        <label className="text-sm text-gray-600">{label}</label>
        <input type="date" className={`${inputBaseClass}`} value={value} />
      </div>
    </div>
  );
}
