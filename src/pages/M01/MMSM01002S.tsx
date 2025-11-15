import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * 페이지: 원자재 발주 현황 (MMSM01002S)
 * 원본: ASP.NET WebForms + DevExpress
 * 변환: React + Tailwind (shadcn/ui 없이도 동작)
 * - 조회 조건: 기간, 거래처, 자재구분, 제품
 * - 코드검색 팝업: 거래처/자재 (임시 Mock 구현)
 * - 그리드: 기본 테이블 + 고정 헤더 + 전체 높이 사용
 * - 엑셀: CSV 다운로드 (서버 연동 전까지 임시)
 *
 * TODO(실서버 연동 시):
 * 1) fetchList() 를 실제 API로 교체
 * 2) CodePicker 에서 /UI/M08/... 페이지를 라우팅/마이그레이션하여 검색 구현
 * 3) 엑셀은 서버 사이드 엑셀 혹은 xlsx 라이브러리로 교체 가능
 */

// === 타입 ===
export type MatGb = 'ALL' | 'A' | 'B' | 'C';

export interface SearchForm {
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd
  cstCd: string;
  cstNm: string;
  itemCd: string;
  itemNm: string;
  matGb: MatGb;
}

export interface RowItem {
  RNUM: number; // 순번
  PO_NO: string; // 발주번호
  PO_YMD: string; // 발주일자 yyyy.MM.dd
  ITEM_GB: string; // 원자재구분
  ITEM_NM: string; // 원자재명
  ITEM_TP: string; // 종류
  STANDARD: string; // 규격
  REQ_YMD: string; // 입고요청일
  IV_YMD: string; // 입고일
  PO_QTY: number; // 발주량
  PRE_IV_QTY: number; // 기입고량
  IV_QTY: number; // 입고량
}

// === 유틸 ===
const fmtDateDot = (d: string) => d?.split('-').join('.') ?? '';

const toCsv = (rows: RowItem[]) => {
  const header = [
    '순번',
    '발주번호',
    '발주일자',
    '원자재구분',
    '원자재명',
    '종류',
    '규격',
    '입고요청일',
    '입고일',
    '발주량',
    '기입고량',
    '입고량',
  ];
  const body = rows.map((r) => [
    r.RNUM,
    r.PO_NO,
    r.PO_YMD,
    r.ITEM_GB,
    r.ITEM_NM,
    r.ITEM_TP,
    r.STANDARD,
    r.REQ_YMD,
    r.IV_YMD,
    r.PO_QTY,
    r.PRE_IV_QTY,
    r.IV_QTY,
  ]);
  return [header, ...body].map((cols) => cols.join(',')).join('\n');
};

const download = (
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8;'
) => {
  const blob = new Blob(['\uFEFF' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
};

// === 임시 데이터 ===
const mockFetch = async (_form: SearchForm): Promise<RowItem[]> => {
  // 실제 API 교체 필요
  await new Promise((r) => setTimeout(r, 150));
  const base: RowItem[] = Array.from({ length: 28 }).map((_, i) => ({
    RNUM: i + 1,
    PO_NO: `PO2025-10-${String(1000 + i)}`,
    PO_YMD: '2025.10.01',
    ITEM_GB: ['AL', 'CU', 'FE', 'PL'][i % 4],
    ITEM_NM: `원자재-${(i % 7) + 1}`,
    ITEM_TP: ['Sheet', 'Bar', 'Powder'][i % 3],
    STANDARD: ['10x20', 'M12', '#300'][i % 3],
    REQ_YMD: '2025.10.05',
    IV_YMD: i % 2 === 0 ? '2025.10.06' : '',
    PO_QTY: 100 + i,
    PRE_IV_QTY: i % 5 === 0 ? 50 : 0,
    IV_QTY: i % 2 === 0 ? 100 : 0,
  }));
  return base;
};

// === 코드 선택 팝업 ===
interface CodePickerProps {
  typeCode: 'Customer' | 'mat';
  title: string;
  onSelect: (v: { code: string; name: string }) => void;
  onClose: () => void;
}

const CodePicker: React.FC<CodePickerProps> = ({
  typeCode,
  title,
  onSelect,
  onClose,
}) => {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    if (typeCode === 'Customer') {
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
  }, [typeCode]);

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
          <button
            className="p-1 hover:bg-gray-100 rounded-full"
            onClick={onClose}
          >
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
                        onSelect({ code: v.code, name: v.name });
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
};

// === 메인 페이지 ===
const MMSM01002S: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const first = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today]
  );
  const [form, setForm] = useState<SearchForm>({
    startDate: first.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    cstCd: '',
    cstNm: '',
    itemCd: '',
    itemNm: '',
    matGb: 'ALL',
  });
  const [rows, setRows] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [picker, setPicker] = useState<null | {
    type: 'Customer' | 'mat';
    title: string;
  }>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [tableHeight, setTableHeight] = useState<number>(520);
  useEffect(() => {
    // body 영역 높이에 맞춰 테이블 높이 조정 (gridInit 대체)
    const handler = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const h = window.innerHeight - rect.top - 24; // 하단 여백 24
      setTableHeight(Math.max(240, h));
    };
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await mockFetch(form);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!rows.length) return;
    const csv = toCsv(rows);
    const yyyymmdd = form.endDate.split('-').join('');
    download(`원자재발주현황_${yyyymmdd}.csv`, csv);
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4" ref={containerRef}>
      {/* 조건 영역 */}
      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="grid grid-cols-12 gap-3 items-center">
          <label className="col-span-1 text-sm text-gray-600">요청일자</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="col-span-2 h-9 rounded-lg border px-2"
          />
          <div className="col-span-1 text-center">~</div>
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="col-span-2 h-9 rounded-lg border px-2"
          />

          <label className="col-span-1 text-sm text-gray-600">거래처명</label>
          <div className="col-span-2 flex gap-2">
            <input
              value={form.cstCd}
              readOnly
              className="w-24 h-9 rounded-lg border bg-gray-100 px-2"
            />
            <div className="flex-1 relative">
              <input
                value={form.cstNm}
                readOnly
                className="w-full h-9 rounded-lg border bg-gray-100 pl-3 pr-9"
              />
              <button
                className="absolute right-1 top-1.5 rounded-md border px-2 py-0.5 text-sm hover:bg-gray-50"
                onClick={() =>
                  setPicker({ type: 'Customer', title: '거래처 정보' })
                }
              >
                검색
              </button>
            </div>
          </div>

          <label className="col-span-1 text-sm text-gray-600">자재구분</label>
          <select
            value={form.matGb}
            onChange={(e) =>
              setForm({ ...form, matGb: e.target.value as MatGb })
            }
            className="col-span-1 h-9 rounded-lg border px-2"
          >
            <option value="ALL">전체</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>

          <label className="col-span-1 text-sm text-gray-600">제품명</label>
          <div className="col-span-2 flex gap-2">
            <input
              value={form.itemCd}
              readOnly
              className="w-24 h-9 rounded-lg border bg-gray-100 px-2"
            />
            <div className="flex-1 relative">
              <input
                value={form.itemNm}
                readOnly
                className="w-full h-9 rounded-lg border bg-gray-100 pl-3 pr-9"
              />
              <button
                className="absolute right-1 top-1.5 rounded-md border px-2 py-0.5 text-sm hover:bg-gray-50"
                onClick={() => setPicker({ type: 'mat', title: '원자재 검색' })}
              >
                검색
              </button>
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={fetchList}
            className="rounded-xl border bg-white px-4 py-2 shadow-sm hover:bg-gray-50 active:scale-[0.99]"
            disabled={loading}
          >
            {loading ? '조회중...' : '조회'}
          </button>
          <button
            onClick={exportExcel}
            className="rounded-xl border bg-white px-4 py-2 shadow-sm hover:bg-gray-50 active:scale-[0.99] disabled:opacity-50"
            disabled={!rows.length}
          >
            엑셀
          </button>
        </div>
      </div>

      {/* 그리드 영역 */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div
          className="max-w-full overflow-auto"
          style={{ height: tableHeight }}
        >
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                <Th w="80">순번</Th>
                <Th w="0" className="hidden">
                  발주번호
                </Th>
                <Th w="100">발주일자</Th>
                <Th w="100">원자재구분</Th>
                <Th w="160">원자재명</Th>
                <Th w="120">종류</Th>
                <Th w="120">규격</Th>
                <Th w="120">입고요청일</Th>
                <Th w="120">입고일</Th>
                <Th w="100" align="right">
                  발주량
                </Th>
                <Th w="100" align="right">
                  기입고량
                </Th>
                <Th w="100" align="right">
                  입고량
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.RNUM}
                  className="border-b last:border-b-0 hover:bg-gray-50"
                >
                  <Td align="center">{r.RNUM}</Td>
                  <Td className="hidden">{r.PO_NO}</Td>
                  <Td align="center">{r.PO_YMD}</Td>
                  <Td align="center">{r.ITEM_GB}</Td>
                  <Td>{r.ITEM_NM}</Td>
                  <Td>{r.ITEM_TP}</Td>
                  <Td align="center">{r.STANDARD}</Td>
                  <Td align="center">{r.REQ_YMD}</Td>
                  <Td align="center">{r.IV_YMD}</Td>
                  <Td align="right">{r.PO_QTY.toLocaleString()}</Td>
                  <Td align="right">{r.PRE_IV_QTY.toLocaleString()}</Td>
                  <Td align="right">{r.IV_QTY.toLocaleString()}</Td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <Td
                    colSpan={12}
                    align="center"
                    className="py-10 text-gray-400"
                  >
                    데이터가 없습니다. 조건을 변경하고 조회를 눌러주세요.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 코드 팝업 */}
      {picker && (
        <CodePicker
          typeCode={picker.type}
          title={picker.title}
          onClose={() => setPicker(null)}
          onSelect={(v) => {
            if (picker.type === 'Customer') {
              setForm((f) => ({ ...f, cstCd: v.code, cstNm: v.name }));
            } else {
              setForm((f) => ({ ...f, itemCd: v.code, itemNm: v.name }));
            }
          }}
        />
      )}
    </div>
  );
};

export default MMSM01002S;

// === 프리미티브 테이블 셀 ===
const Th: React.FC<{
  children: React.ReactNode;
  w?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
}> = ({ children, w, align = 'center', className }) => (
  <th
    className={
      'py-2 px-2 text-gray-700 text-xs font-semibold border-b ' +
      (className ?? '')
    }
    style={{ width: typeof w === 'number' ? `${w}px` : w, textAlign: align }}
  >
    {children}
  </th>
);

const Td: React.FC<{
  children: React.ReactNode;
  colSpan?: number;
  align?: 'left' | 'center' | 'right';
  className?: string;
}> = ({ children, colSpan, align = 'left', className }) => (
  <td
    className={'py-2 px-2 ' + (className ?? '')}
    colSpan={colSpan}
    style={{ textAlign: align }}
  >
    {children}
  </td>
);
