import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';

import { getApi } from '@/lib/axiosClient';

export type MaterialCodePickerItem = {
  code: string;
  name: string;
};

export interface MaterialCodePickerProps {
  title: string;
  itemGb: 'FG' | 'SFG' | 'RAW' | 'SUB';
  onSelect: (value: MaterialCodePickerItem) => void;
  onClose: () => void;
  itemCd?: string;
  itemNm?: string;
}

type MaterialSearchRow = Record<string, unknown>;

type MaterialSearchParams = {
  itemCd?: string;
  itemNm?: string;
  itemGb?: string;
};

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }

  return '';
}

async function fetchMaterialItems({ itemCd = '', itemNm = '', itemGb = '' }: MaterialSearchParams) {
  const rows = await getApi<MaterialSearchRow[]>('/api/v1/mdm/iteminfo/search', {
    itemCd: itemCd,
    itemNm: itemNm,
    itemgb: itemGb,
  });

  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      code: pickString(row, ['itemCd', 'ITEM_CD', 'code', 'CODE', 'id', 'ID']),
      name: pickString(row, ['itemNm', 'ITEM_NM', 'name', 'NAME', 'text', 'TEXT']),
    }))
    .filter((row) => row.code || row.name);
}

export default function MaterialCodePicker({
  title,
  itemGb,
  onSelect,
  onClose,
  itemCd,
  itemNm,
}: MaterialCodePickerProps) {
  const [materialCode, setMaterialCode] = useState(itemCd ?? '');
  const [materialName, setMaterialName] = useState(itemNm ?? '');
  const [rows, setRows] = useState<MaterialCodePickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMaterialCode(itemCd ?? '');
    setMaterialName(itemNm ?? '');
    setError(null);
    setLoaded(false);
    setRows([]);
  }, [itemCd, itemNm]);

  const searchMaterials = useCallback(async (nextCode: string, nextName: string) => {
    setLoading(true);
    setError(null);

    try {
      const list = await fetchMaterialItems({
        itemCd: nextCode.trim(),
        itemNm: nextName.trim(),
      });
      setRows(list);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void searchMaterials(itemCd ?? '', itemNm ?? '');
  }, [itemCd, itemNm, itemGb, searchMaterials]);

  const emptyMessage = loaded ? '조회된 원자재가 없습니다.' : '원자재 목록을 불러오는 중...';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex max-h-[560px] w-[760px] flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="rounded-full p-1 hover:bg-gray-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="border-b p-4">
          <div className="grid grid-cols-[140px_1fr_140px_1fr_auto] items-end gap-3">
            <label className="text-sm text-gray-600">
              <span className="mb-1 block">원자재코드</span>
              <input
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void searchMaterials(materialCode, materialName);
                }}
                placeholder="원자재코드"
                className="h-10 w-full rounded-xl border px-3 outline-none focus:ring"
              />
            </label>
            <div />
            <label className="text-sm text-gray-600">
              <span className="mb-1 block">원자재명</span>
              <input
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void searchMaterials(materialCode, materialName);
                }}
                placeholder="원자재명"
                className="h-10 w-full rounded-xl border px-3 outline-none focus:ring"
              />
            </label>
            <div />
            <button
              type="button"
              className="h-10 rounded-xl border px-4 hover:bg-gray-50 disabled:opacity-50"
              onClick={() => void searchMaterials(materialCode, materialName)}
              disabled={loading}
            >
              {loading ? '조회중...' : '조회'}
            </button>
          </div>
        </div>

        {error ? <div className="px-4 pt-4 text-sm text-red-600">{error}</div> : null}

        <div className="overflow-auto px-4 pb-4 pt-4">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left">코드</th>
                <th className="px-2 py-2 text-left">이름</th>
                <th className="w-24 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.code}_${row.name}`} className="border-t">
                  <td className="px-2 py-2">{row.code}</td>
                  <td className="px-2 py-2">{row.name}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      className="rounded-lg border px-3 py-1 hover:bg-gray-50"
                      onClick={() => {
                        onSelect(row);
                        onClose();
                      }}
                    >
                      선택
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-8 text-center text-sm text-gray-400">
                    {loading ? '원자재 목록을 불러오는 중...' : emptyMessage}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
