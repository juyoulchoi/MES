import type { MouseEventHandler } from 'react';

type ActionButtonGroupProps = {
  onSearch: MouseEventHandler<HTMLButtonElement>;
  onSave: MouseEventHandler<HTMLButtonElement>;
  onUpload: MouseEventHandler<HTMLButtonElement>;
  onExport: MouseEventHandler<HTMLButtonElement>;
  searchDisabled?: boolean;
  saveDisabled?: boolean;
  uploadDisabled?: boolean;
  exportDisabled?: boolean;
  className?: string;
};

export default function ActionButtonGroup({
  onSearch,
  onSave,
  onUpload,
  onExport,
  searchDisabled = false,
  saveDisabled = false,
  uploadDisabled = false,
  exportDisabled = false,
  className = 'flex flex-wrap items-end justify-end gap-2',
}: ActionButtonGroupProps) {
  return (
    <div className={className}>
      <button
        onClick={onSearch}
        disabled={searchDisabled}
        className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        조회
      </button>
      <button
        onClick={onSave}
        disabled={saveDisabled}
        className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        저장
      </button>
      <button
        onClick={onUpload}
        disabled={uploadDisabled}
        className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        엑셀 업로드
      </button>
      <button
        onClick={onExport}
        disabled={exportDisabled}
        className="h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
      >
        양식 다운로드
      </button>
    </div>
  );
}
