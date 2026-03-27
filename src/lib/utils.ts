import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 객체를 URLSearchParams로 변환하는 유틸 함수
export function toParams(obj: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  return params;
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const numberValue = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(numberValue)) return String(value);
  return numberValue.toLocaleString('ko-KR');
}

export function toYmd(date: string): string {
  const trimmed = date?.trim();
  if (!trimmed) return '';
  return trimmed.replace(/-/g, '');
}
