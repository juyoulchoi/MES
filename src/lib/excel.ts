import * as XLSX from 'xlsx';

export type RawExcelRow = Record<string, string | number | null | undefined>;

export function toYmd(value: string) {
  if (!value) return '';
  return value.replace(/-/g, '');
}

export function normalizeString(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function normalizeQty(value: unknown) {
  if (typeof value === 'number') return value;
  const text = normalizeString(value).replace(/,/g, '');
  if (!text) return '';
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : text;
}

export function isBlankExcelRow(row: RawExcelRow) {
  return Object.values(row).every((value) => normalizeString(value) === '');
}

export function downloadExcelFile(workbook: XLSX.WorkBook, filename: string) {
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
