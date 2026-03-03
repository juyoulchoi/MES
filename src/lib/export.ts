export type CsvCell = string | number | boolean | null | undefined;

export function toCsvText(rows: CsvCell[][]): string {
  return rows
    .map((cols) =>
      cols
        .map((v) => {
          const text = v == null ? '' : String(v);
          const escaped = text.replace(/"/g, '""');
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
        })
        .join(',')
    )
    .join('\n');
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8;'
): void {
  const blob = new Blob(['\uFEFF' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}
