type MasterSearchFieldProps = {
  label: string;
  code: string;
  name: string;
  onSearch: () => void;
  codePlaceholder?: string;
  namePlaceholder?: string;
  searchLabel?: string;
};

export default function MasterSearchField({
  label,
  code,
  name,
  onSearch,
  codePlaceholder = '',
  namePlaceholder = '',
  searchLabel = '검색',
}: MasterSearchFieldProps) {
  return (
    <div className="w-[550px]">
      <div className="grid grid-cols-[100px_120px_300px] items-center gap-2">
        <label className="text-sm text-gray-600">{label}</label>
        <input
          value={code}
          readOnly
          placeholder={codePlaceholder}
          className="h-9 w-[120px] rounded-lg border bg-gray-100 px-2"
        />
        <div className="relative">
          <input
            value={name}
            readOnly
            placeholder={namePlaceholder}
            className="h-9 w-full rounded-lg border bg-gray-100 pl-3 pr-9"
          />
          <button
            type="button"
            className="absolute right-1 top-1.5 rounded-md border px-2 py-0.5 text-sm hover:bg-gray-50"
            onClick={onSearch}
          >
            {searchLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
