import React, { useMemo, useRef, useState } from 'react';
import { MathGb, MathGbLabel } from '../../lib/types';
import CodePicker, { CodePickerType } from '@/components/CodePicker';
import MasterSearchField from '@/components/MasterSearchField';
import FromToDateSearchField from '@/components/FromToDateSearchField';
import { Th, Td } from '@/components/table/BaseTable';
import { toCsvText, downloadTextFile } from '@/lib/export';
import { useAutoTableHeight } from '@/lib/hooks/useAutoTableHeight';

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

export interface SearchForm {
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd
  cstCd: string;
  cstNm: string;
  itemCd: string;
  itemNm: string;
  mathGb: MathGb;
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

// === 메인 페이지 ===
const MMSM01002S: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const first = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);
  const [form, setForm] = useState<SearchForm>({
    startDate: first.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    cstCd: '',
    cstNm: '',
    itemCd: '',
    itemNm: '',
    mathGb: MathGb.ALL,
  });
  const [rows, setRows] = useState<RowItem[]>([]);

  const [loading, setLoading] = useState(false);

  const [picker, setPicker] = useState<null | {
    type: CodePickerType;
    title: string;
  }>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const tableHeight = useAutoTableHeight(containerRef);

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
    const csv = toCsvText([header, ...body]);
    const yyyymmdd = form.endDate.split('-').join('');
    downloadTextFile(`원자재발주현황_${yyyymmdd}.csv`, csv);
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4" ref={containerRef}>
      {/* 조건 영역 */}
      <div className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="grid [grid-template-columns:600px_600px_300px_1fr] gap-2 items-end">
          <FromToDateSearchField
            label="요청일자"
            fromValue={form.startDate}
            toValue={form.endDate}
            onFromChange={(value) => setForm({ ...form, startDate: value })}
            onToChange={(value) => setForm({ ...form, endDate: value })}
          />

          <MasterSearchField
            label="거래처명"
            code={form.cstCd}
            name={form.cstNm}
            codePlaceholder="코드"
            namePlaceholder="거래처 선택"
            onSearch={() => setPicker({ type: 'customer', title: '거래처 정보' })}
          />

          <div className="w-[300px] grid grid-cols-[100px_170px_1fr] items-center gap-2">
            <label className="text-sm text-gray-600">자재구분</label>
            <select
              value={form.mathGb}
              onChange={(e) => setForm({ ...form, mathGb: e.target.value as MathGb })}
              className="h-9 w-[170px] rounded-lg border px-2"
            >
              <option value={MathGb.ALL}>{MathGbLabel.ALL}</option>
              <option value={MathGb.A}>{MathGbLabel.A}</option>
              <option value={MathGb.B}>{MathGbLabel.B}</option>
              <option value={MathGb.C}>{MathGbLabel.C}</option>
            </select>
          </div>
        </div>

        <div className="mt-2">
          <MasterSearchField
            label="제품명"
            code={form.itemCd}
            name={form.itemNm}
            codePlaceholder="코드"
            namePlaceholder="제품 선택"
            onSearch={() => setPicker({ type: 'math', title: '원자재 검색' })}
          />
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
        <div className="max-w-full overflow-auto" style={{ height: tableHeight }}>
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
                <tr key={r.RNUM} className="border-b last:border-b-0 hover:bg-gray-50">
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
                  <Td colSpan={12} align="center" className="py-10 text-gray-400">
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
            if (picker.type === 'customer') {
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
