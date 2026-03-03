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
