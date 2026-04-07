import * as XLSX from 'xlsx';
import {
  downloadExcelFile,
  isBlankExcelRow,
  normalizeQty,
  normalizeString,
  type RawExcelRow,
} from '@/lib/excel';

export type CommonExcelUploadRow = {
  itemCd: string;
  itemNm?: string;
  unitCd?: string;
  qty: number | string;
  desc?: string;
};

export type CommonExcelValidateResponse = {
  validRows?: CommonExcelUploadRow[];
  errors?: Array<{
    rowNo: number;
    field?: string;
    message: string;
  }>;
};

export async function parseExcelUploadFile(file: File): Promise<CommonExcelUploadRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('엑셀 시트를 찾을 수 없습니다.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<RawExcelRow>(sheet, {
    defval: '',
    raw: false,
  });

  const rows = rawRows.filter((row) => !isBlankExcelRow(row));

  if (rows.length === 0) {
    throw new Error('업로드할 데이터가 없습니다.');
  }

  return rows.map((row, index) => {
    const itemCd = normalizeString(row['품목코드']);
    const qty = normalizeQty(row['수량']);

    if (!itemCd) {
      throw new Error(`${index + 2}행 품목코드 값이 비어 있습니다.`);
    }

    if (qty === '') {
      throw new Error(`${index + 2}행 수량 값이 비어 있습니다.`);
    }

    if (typeof qty !== 'number') {
      throw new Error(`${index + 2}행 수량 값은 숫자여야 합니다.`);
    }

    return {
      itemCd,
      itemNm: normalizeString(row['품목명']),
      unitCd: '',
      qty,
      desc: normalizeString(row['비고']),
    } satisfies CommonExcelUploadRow;
  });
}

export function validateExcelUploadRows(
  rows: CommonExcelUploadRow[]
): CommonExcelValidateResponse {
  const validRows: CommonExcelUploadRow[] = [];
  const errors: NonNullable<CommonExcelValidateResponse['errors']> = [];

  rows.forEach((row, index) => {
    const rowNo = index + 2;
    const itemCd = normalizeString(row.itemCd);
    const qty = row.qty;
    let hasError = false;

    if (!itemCd) {
      errors.push({ rowNo, field: 'itemCd', message: '품목코드는 필수입니다.' });
      hasError = true;
    }

    if (qty === '' || qty === null || qty === undefined) {
      errors.push({ rowNo, field: 'qty', message: '수량은 필수입니다.' });
      hasError = true;
    }

    if (!hasError) {
      validRows.push({
        itemCd,
        itemNm: normalizeString(row.itemNm),
        unitCd: normalizeString(row.unitCd),
        qty,
        desc: normalizeString(row.desc),
      });
    }
  });

  return { validRows, errors };
}

export function exportExcelTemplate(
  filename: string,
  sampleRows: Array<Record<string, unknown>>,
  headers: string[],
  sheetName = 'upload'
) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  downloadExcelFile(workbook, filename);
}
