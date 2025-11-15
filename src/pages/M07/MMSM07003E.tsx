import { useEffect, useMemo, useState } from 'react';
import { http } from '@/lib/http';

// 프로그램 메뉴 관리 (MMSM07003E)
// 좌: 트리(메뉴) | 우: 선택 메뉴 상세 폼
// 버튼: 동일행추가, 하위행추가, 조회, 저장, 삭제

type MenuNode = {
  MENU_ID: string;
  TOP_MENU: string | null;
  MENU_NM: string;
  LVL: number;
};

type Detail = {
  ISNEW?: boolean;
  TOP_MENU: string;
  MENU_ID: string; // 신규 저장 시 서버 발번 또는 입력 필요 여부는 백엔드 정책에 따름 (현재 읽기전용 가정)
  MENU_NM: string;
  LVL: number;
  DSP_SEQ: number | string;
  PGM_ID: string;
  PGM_NM: string;
};

export default function MMSM07003E() {
  const [tree, setTree] = useState<MenuNode[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [detail, setDetail] = useState<Detail | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nodesByParent = useMemo(() => {
    const map = new Map<string | null, MenuNode[]>();
    for (const n of tree) {
      const key = (n.TOP_MENU ?? '') as unknown as string | null; // normalize null/''
      const k = (key === '' ? null : key);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(n);
    }
    for (const [, arr] of map) arr.sort((a,b) => (a.MENU_NM||'').localeCompare(b.MENU_NM||''));
    return map;
  }, [tree]);

  function getNode(id: string) {
    return tree.find(n => n.MENU_ID === id) || null;
  }

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const data = await http<MenuNode[]>(`/api/m07/mmsm07003/tree`);
      const list = (Array.isArray(data) ? data : []).map(r => ({
        MENU_ID: r.MENU_ID ?? '',
        TOP_MENU: r.TOP_MENU ?? null,
        MENU_NM: r.MENU_NM ?? '',
        LVL: Number(r.LVL ?? 0),
      }));
      setTree(list);
      const first = list[0];
      if (first) {
        setSelectedId(first.MENU_ID);
        const det = await fetchDetail(first.MENU_ID);
        setDetail(det);
      } else {
        setSelectedId(''); setDetail(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function fetchDetail(menuId: string): Promise<Detail> {
    const qs = new URLSearchParams({ menu_id: menuId }).toString();
    const d = await http<any>(`/api/m07/mmsm07003/detail?${qs}`);
    return {
      ISNEW: !!d?.ISNEW,
      TOP_MENU: d?.TOP_MENU ?? '',
      MENU_ID: d?.MENU_ID ?? menuId,
      MENU_NM: d?.MENU_NM ?? '',
      LVL: Number(d?.LVL ?? getNode(menuId)?.LVL ?? 0),
      DSP_SEQ: d?.DSP_SEQ ?? '',
      PGM_ID: d?.PGM_ID ?? '',
      PGM_NM: d?.PGM_NM ?? '',
    };
  }

  async function onSelect(menuId: string) {
    setSelectedId(menuId);
    setLoading(true); setError(null);
    try { setDetail(await fetchDetail(menuId)); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  function onAddSame() {
    const cur = selectedId ? getNode(selectedId) : null;
    const parentId = (cur?.TOP_MENU ?? '') as string;
    const lvl = Number(cur?.LVL ?? 0);
    setDetail({ ISNEW: true, TOP_MENU: parentId || '', MENU_ID: '', MENU_NM: '', LVL: lvl, DSP_SEQ: '', PGM_ID: '', PGM_NM: '' });
  }

  function onAddChild() {
    const cur = selectedId ? getNode(selectedId) : null;
    const parentId = cur?.MENU_ID ?? '';
    const lvl = Number(cur?.LVL ?? 0) + 1;
    if (!parentId) { setError('좌측에서 기준 메뉴를 선택하세요.'); return; }
    setDetail({ ISNEW: true, TOP_MENU: parentId, MENU_ID: '', MENU_NM: '', LVL: lvl, DSP_SEQ: '', PGM_ID: '', PGM_NM: '' });
  }

  async function onDelete() {
    if (!selectedId) { setError('삭제할 메뉴를 선택하세요.'); return; }
    if (!window.confirm('삭제 하시겠습니까?')) return;
    setLoading(true); setError(null);
    try {
      await http(`/api/m07/mmsm07003/delete`, { method: 'POST', body: { MENU_ID: selectedId } });
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function onSave() {
    if (!detail) { setError('저장할 항목이 없습니다.'); return; }
    if (!detail.MENU_NM) { setError('메뉴명을 입력하세요.'); return; }
    if (!window.confirm('저장 하시겠습니까?')) return;
    setLoading(true); setError(null);
    try {
      const payload = {
        ISNEW: !!detail.ISNEW,
        TOP_MENU: detail.TOP_MENU ?? '',
        MENU_ID: detail.MENU_ID ?? '',
        MENU_NM: detail.MENU_NM ?? '',
        LVL: Number(detail.LVL ?? 0),
        DSP_SEQ: detail.DSP_SEQ === '' || detail.DSP_SEQ === null || detail.DSP_SEQ === undefined ? null : Number(detail.DSP_SEQ),
        PGM_ID: detail.PGM_ID ?? '',
        PGM_NM: detail.PGM_NM ?? '',
      };
      await http(`/api/m07/mmsm07003/save`, { method: 'POST', body: payload });
      // 저장 후 재조회 및 선택 유지
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function renderTree(parent: string | null, indent: number) {
    const children = nodesByParent.get(parent ?? null) || [];
    const items: any[] = [];
    for (const n of children) {
      items.push(
        <div key={n.MENU_ID} className={`flex items-center px-2 py-1 cursor-pointer hover:bg-muted/30 ${selectedId===n.MENU_ID? 'bg-muted/30 font-medium':''}`} style={{ paddingLeft: indent }} onClick={() => onSelect(n.MENU_ID)}>
          <span className="truncate">{n.MENU_NM}</span>
        </div>
      );
      items.push(...renderTree(n.MENU_ID, indent + 16));
    }
    return items;
  }

  function patchDetail(p: Partial<Detail>) {
    setDetail(prev => prev ? { ...prev, ...p } : prev);
  }

  async function onPickProgram() {
    // 자리표시자: 간단 프롬프트로 연결. 추후 모달/검색 연동 가능
    const id = window.prompt('프로그램ID를 입력하세요', detail?.PGM_ID || '');
    if (id === null) return;
    const name = window.prompt('프로그램명을 입력하세요', detail?.PGM_NM || '');
    if (name === null) return;
    patchDetail({ PGM_ID: id, PGM_NM: name });
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">프로그램 메뉴 관리</div>

      {/* Top Buttons */}
      <div className="flex gap-2 justify-end">
        <button onClick={onAddSame} disabled={loading} className="h-8 px-3 border rounded">동일행추가</button>
        <button onClick={onAddChild} disabled={loading} className="h-8 px-3 border rounded">하위행추가</button>
        <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
        <button onClick={onSave} disabled={loading} className="h-8 px-3 border rounded">저장</button>
        <button onClick={onDelete} disabled={loading || !selectedId} className="h-8 px-3 border rounded">삭제</button>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Split: Tree | Detail */}
      <div className="grid grid-cols-12 gap-3">
        {/* Left: Tree */}
        <div className="col-span-12 md:col-span-4 border rounded overflow-auto max-h-[70vh]">
          {renderTree(null, 8)}
          {tree.length === 0 && (
            <div className="p-3 text-center text-muted-foreground">메뉴가 없습니다. 조회를 눌러 로드하세요.</div>
          )}
        </div>

        {/* Right: Detail Form */}
        <div className="col-span-12 md:col-span-8 border rounded p-3 space-y-3">
          {!detail ? (
            <div className="text-sm text-muted-foreground">우측 폼은 좌측에서 메뉴를 선택하거나 추가 후 입력하세요.</div>
          ) : (
            <div className="grid grid-cols-12 gap-3 text-sm">
              <label className="col-span-12 md:col-span-6 flex flex-col">
                <span className="mb-1">상위메뉴ID</span>
                <input className="h-8 border rounded px-2 bg-muted" value={detail.TOP_MENU ?? ''} readOnly />
              </label>
              <label className="col-span-12 md:col-span-6 flex flex-col">
                <span className="mb-1">메뉴ID</span>
                <input className="h-8 border rounded px-2 bg-muted" value={detail.MENU_ID ?? ''} readOnly />
              </label>

              <label className="col-span-12 md:col-span-6 flex flex-col">
                <span className="mb-1">메뉴명</span>
                <input className={`h-8 border rounded px-2 ${!detail.MENU_NM ? 'border-destructive' : ''}`} value={detail.MENU_NM ?? ''} onChange={e => patchDetail({ MENU_NM: e.target.value })} />
              </label>
              <label className="col-span-12 md:col-span-3 flex flex-col">
                <span className="mb-1">메뉴레벨</span>
                <input className="h-8 border rounded px-2 bg-muted" value={detail.LVL ?? 0} readOnly />
              </label>
              <label className="col-span-12 md:col-span-3 flex flex-col">
                <span className="mb-1">순서</span>
                <input className="h-8 border rounded px-2" value={detail.DSP_SEQ ?? ''} onChange={e => patchDetail({ DSP_SEQ: e.target.value.replace(/[^0-9\-]/g,'') })} />
              </label>

              <div className="col-span-12 md:col-span-6">
                <label className="flex flex-col">
                  <span className="mb-1">프로그램ID</span>
                  <div className="flex gap-2">
                    <input className="h-8 border rounded px-2 bg-muted flex-1" value={detail.PGM_ID ?? ''} readOnly />
                    <button className="h-8 px-2 border rounded" onClick={onPickProgram}>검색</button>
                  </div>
                </label>
              </div>
              <label className="col-span-12 md:col-span-6 flex flex-col">
                <span className="mb-1">프로그램명</span>
                <input className="h-8 border rounded px-2 bg-muted" value={detail.PGM_NM ?? ''} readOnly />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
