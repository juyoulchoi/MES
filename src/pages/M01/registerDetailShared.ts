import type { Dispatch, SetStateAction } from 'react';

import { toggleCheckedRow } from '@/lib/gridRows';

export function getTodayYmd() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function toNumericValue(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = String(value).replace(/,/g, '');
  const numeric = Number(normalized);
  return Number.isNaN(numeric) ? 0 : numeric;
}

export function calculateAmount(
  qty: number | string | undefined,
  price: number | string | undefined
) {
  return toNumericValue(qty) * toNumericValue(price);
}

export function updateCheckedRows<T extends { CHECK?: boolean }>(
  setRows: Dispatch<SetStateAction<T[]>>,
  rowIndex: number,
  checked: boolean
) {
  setRows((prev) => toggleCheckedRow(prev, rowIndex, checked));
}
