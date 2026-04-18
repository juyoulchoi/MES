import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type CodeNameFieldProps = {
  label: string;
  id: string;
  code: string;
  name: string;
  onSearch: () => void;
  onClear?: () => void;
  codePlaceholder?: string;
  namePlaceholder?: string;
  searchLabel?: string;
  clearLabel?: string;
};

export default function CodeNameField({
  label,
  id,
  code,
  name,
  onSearch,
  onClear,
  codePlaceholder = '',
  namePlaceholder = '',
  searchLabel = '검색',
  clearLabel = '초기화',
}: CodeNameFieldProps) {
  const hasValue = Boolean(code || name);

  return (
    <div className="w-[546px]">
      <div className="grid grid-cols-[96px_120px_310px] items-center gap-3">
        <Label className="text-sm text-gray-600">{label}</Label>
        <Input
          id={`${id}-code`}
          value={code}
          readOnly
          placeholder={codePlaceholder}
          className="h-9 w-[120px] rounded-lg bg-gray-100 px-2"
        />
        <div className="relative">
          <Input
            id={`${id}-name`}
            value={name}
            readOnly
            placeholder={namePlaceholder}
            className="h-9 w-full rounded-lg bg-gray-100 pl-3 pr-24"
          />
          <div className="absolute right-1 top-1.5 flex items-center gap-1">
            {onClear && hasValue ? (
              <button
                type="button"
                className="rounded-md border px-2 py-0.5 text-sm hover:bg-gray-50"
                onClick={onClear}
              >
                {clearLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-md border px-2 py-0.5 text-sm hover:bg-gray-50"
              onClick={onSearch}
            >
              {searchLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
