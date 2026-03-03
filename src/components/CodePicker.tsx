import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';

export type CodePickerType = 'customer' | 'math';
export type CodePickerItem = { code: string; name: string };

export interface CodePickerProps {
  typeCode: CodePickerType;
  title: string;
  onSelect: (v: CodePickerItem) => void;
  onClose: () => void;
  items?: CodePickerItem[];
}

function getDefaultItems(typeCode: CodePickerType): CodePickerItem[] {
  if (typeCode === 'customer') {
    return [
      { code: 'C001', name: '삼성상사' },
      { code: 'C002', name: '엘지상사' },
      { code: 'C003', name: '한화트레이딩' },
    ];
  }
  return [
    { code: 'M001', name: '알루미늄' },
    { code: 'M002', name: '구리' },
    { code: 'M003', name: '철' },
    { code: 'M004', name: '플라스틱' },
  ];
}

export default function CodePicker({ typeCode, title, onSelect, onClose, items }: CodePickerProps) {
  const [q, setQ] = useState('');

  const list = useMemo(
    () => (Array.isArray(items) && items.length > 0 ? items : getDefaultItems(typeCode)),
    [items, typeCode],
  );

  const filtered = useMemo(() => {
    const k = q.trim();

    if (!k) return list;

    return list.filter((v) => v.code.includes(k) || v.name.includes(k));
  }, [list, q]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[700px] max-h-[520px] rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="p-1 hover:bg-gray-100 rounded-full" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="코드/이름 검색"
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
          />
        </div>
        <div className="px-4 pb-4 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="text-left py-2 px-2">코드</th>
                <th className="text-left py-2 px-2">이름</th>
                <th className="w-24 py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.code} className="border-t">
                  <td className="py-2 px-2">{v.code}</td>
                  <td className="py-2 px-2">{v.name}</td>
                  <td className="py-2 px-2 text-right">
                    <button
                      className="rounded-lg border px-3 py-1 hover:bg-gray-50"
                      onClick={() => {
                        onSelect(v);
                        onClose();
                      }}
                    >
                      선택
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
