import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { CONFIG } from '@/lib/config';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  code?: string;
  status?: number;
  data?: T;
};

const axiosClient = axios.create({
  baseURL: CONFIG.apiBaseUrl,
  withCredentials: CONFIG.authMode === 'session',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  const token =
    CONFIG.authMode === 'token' ? (localStorage.getItem('token') ?? undefined) : undefined;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function unwrapApiEnvelope<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.success === false) {
      throw new Error(envelope.message || '요청 처리에 실패했습니다.');
    }
    return envelope.data as T;
  }
  return payload as T;
}

function toHttpError(err: unknown): Error {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const payload = err.response?.data as ApiEnvelope<unknown> | undefined;
    const code = payload?.code;
    const message = payload?.message || err.message;
    return new Error(
      `HTTP ${status ?? 'UNKNOWN'}${code ? ` ${code}` : ''}${message ? `: ${message}` : ''}`
    );
  }
  return err instanceof Error ? err : new Error(String(err));
}

export async function requestApi<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await axiosClient.request<ApiEnvelope<T> | T>(config);
    return unwrapApiEnvelope(response.data);
  } catch (err) {
    throw toHttpError(err);
  }
}

export function getApi<T>(url: string, params?: Record<string, string>): Promise<T> {
  return requestApi<T>({ method: 'GET', url, params });
}

