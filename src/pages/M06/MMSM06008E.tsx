import { useEffect, useState } from 'react';
import { http } from '@/lib/http';

// 작업장별 사용자 지정 (MMSM06008E)
// 좌: 작업장 목록 | 중간 버튼(추가/삭제) | 우: 상단 전체 사용자 목록, 하단 작업장 사용자 목록
// 기능: 작업장 선택 시 우측 두 목록 로드, 선택 후 추가/삭제, CSV 내보내기

type Row = Record<string, any>;

type LineRow = {
  CHECK?: boolean;
  LINE_CD?: string;
  LINE_NM?: string;
  [k: string]: any;
};

type UserRow = {
  CHECK?: boolean;
  USR_ID?: string;
  USR_NM?: string;
  [k: string]: any;
};

export default function MMSM06008E() {
  // Data
  const [lines, setLines] = useState<LineRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]); // 전체 사용자
  const [lineUsers, setLineUsers] = useState<UserRow[]>([]); // 작업장 사용자
  const [selectedLine, setSelectedLine] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchLines() {
    const data = await http<LineRow[]>(`/api/m06/mmsm06008/lines`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }
  async function fetchUsers() {
    const data = await http<UserRow[]>(`/api/m06/mmsm06008/users`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }
  async function fetchLineUsers(line: string) {
    if (!line) return [] as UserRow[];
    const qs = new URLSearchParams({ line_cd: line }).toString();
    const data = await http<UserRow[]>(`/api/m06/mmsm06008/line-users?${qs}`);
    return (Array.isArray(data) ? data : []).map(r => ({ ...r, CHECK: false }));
  }

  async function onSearch() {
    setLoading(true); setError(null);
    try {
      const [l, u] = await Promise.all([fetchLines(), fetchUsers()]);
      setLines(l);
      setUsers(u);
      const line = l[0]?.LINE_CD || '';
      setSelectedLine(line);
      const lu = await fetchLineUsers(line);
      setLineUsers(lu);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function onSelectLine(i: number) {
    const line = lines[i]?.LINE_CD || '';
    setSelectedLine(line);
    setLoading(true); setError(null);
    try {
      const [u, lu] = await Promise.all([fetchUsers(), fetchLineUsers(line)]);
      setUsers(u);
      setLineUsers(lu);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function toggleLine(i: number, checked: boolean) {
    setLines(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }
  function toggleUsers(listSetter: (updater: (prev: UserRow[]) => UserRow[]) => void, i: number, checked: boolean) {
    listSetter(prev => { const next = [...prev]; next[i] = { ...next[i], CHECK: checked }; return next; });
  }

  async function onAddUsersToLine() {
    if (!selectedLine) { setError('좌측에서 작업장을 선택하세요.'); return; }
    const targets = users.filter(r => r.CHECK).map(r => r.USR_ID).filter(Boolean) as string[];
    if (targets.length === 0) { setError('추가할 사용자를 선택하세요.'); return; }
    setLoading(true); setError(null);
    try {
      const payload = targets.map(id => ({ LINE_CD: selectedLine, USR_ID: id }));
      await http(`/api/m06/mmsm06008/add`, { method: 'POST', body: payload });
      const lu = await fetchLineUsers(selectedLine); setLineUsers(lu);
      setUsers(prev => prev.map(r => ({ ...r, CHECK: false })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function onRemoveUsersFromLine() {
    if (!selectedLine) { setError('좌측에서 작업장을 선택하세요.'); return; }
    const targets = lineUsers.filter(r => r.CHECK).map(r => r.USR_ID).filter(Boolean) as string[];
    if (targets.length === 0) { setError('삭제할 사용자를 선택하세요.'); return; }
    setLoading(true); setError(null);
    try {
      const payload = targets.map(id => ({ LINE_CD: selectedLine, USR_ID: id }));
      await http(`/api/m06/mmsm06008/delete`, { method: 'POST', body: payload });
      const lu = await fetchLineUsers(selectedLine); setLineUsers(lu);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  function onExportCsv() {
    const headers = ['작업장','사용자ID','사용자명'];
    const linesCsv = lineUsers.map((r) => [
      selectedLine,
      r.USR_ID ?? '',
      r.USR_NM ?? '',
    ].map(v => (v ?? '').toString().replace(/"/g, '""')).map(v => `"${v}"`).join(','));
    const csv = [headers.join(','), ...linesCsv].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'MMSM06008E_line_users.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">작업장 사용자 지정</div>

      {/* Top Buttons */}
      <div className="flex gap-2 justify-end">
        <button onClick={onSearch} disabled={loading} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">조회</button>
        <button onClick={onExportCsv} className="h-8 px-3 border rounded">엑셀</button>
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}

      {/* Layout: Lines | Buttons | Right (Users | Line Users) */}
      <div className="grid grid-cols-12 gap-3">
        {/* Lines */}
        <div className="col-span-12 md:col-span-3 border rounded overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-12 p-2 text-center">선택</th>
                <th className="w-28 p-2 text-center">작업장코드</th>
                <th className="p-2 text-left">작업장명</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((r, i) => (
                <tr key={i} className={`border-b hover:bg-muted/30 cursor-pointer ${selectedLine===r.LINE_CD? 'bg-muted/30': ''}`} onClick={() => onSelectLine(i)}>
                  <td className="p-2 text-center" onClick={e=>e.stopPropagation()}><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleLine(i, e.target.checked)} /></td>
                  <td className="p-2 text-center">{r.LINE_CD ?? ''}</td>
                  <td className="p-2 text-left">{r.LINE_NM ?? ''}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-muted-foreground">작업장이 없습니다. 조회를 눌러 로드하세요.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Middle Buttons */}
        <div className="col-span-12 md:col-span-1 flex md:flex-col gap-2 items-center justify-center">
          <button onClick={onRemoveUsersFromLine} disabled={loading || !selectedLine} className="h-8 px-3 border rounded">삭제</button>
          <button onClick={onAddUsersToLine} disabled={loading || !selectedLine} className="h-8 px-3 border rounded">추가</button>
        </div>

        {/* Right side: Users | Line Users */}
        <div className="col-span-12 md:col-span-8 grid grid-rows-2 gap-3">
          {/* All Users */}
          <div className="border rounded overflow-auto">
            <div className="p-2 text-sm font-medium">전체 사용자</div>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="w-12 p-2 text-center">선택</th>
                  <th className="w-28 p-2 text-center">사용자ID</th>
                  <th className="p-2 text-left">사용자명</th>
                </tr>
              </thead>
              <tbody>
                {users.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleUsers(setUsers, i, e.target.checked)} /></td>
                    <td className="p-2 text-center">{r.USR_ID ?? ''}</td>
                    <td className="p-2 text-left">{r.USR_NM ?? ''}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-3 text-center text-muted-foreground">전체 사용자 목록이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Line Users */}
          <div className="border rounded overflow-auto">
            <div className="p-2 text-sm font-medium">작업장 사용자</div>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="w-12 p-2 text-center">선택</th>
                  <th className="w-28 p-2 text-center">사용자ID</th>
                  <th className="p-2 text-left">사용자명</th>
                </tr>
              </thead>
              <tbody>
                {lineUsers.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-center"><input type="checkbox" checked={!!r.CHECK} onChange={e => toggleUsers(setLineUsers, i, e.target.checked)} /></td>
                    <td className="p-2 text-center">{r.USR_ID ?? ''}</td>
                    <td className="p-2 text-left">{r.USR_NM ?? ''}</td>
                  </tr>
                ))}
                {lineUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-3 text-center text-muted-foreground">작업장에 등록된 사용자가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
