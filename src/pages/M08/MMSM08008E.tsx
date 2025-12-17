import { useEffect, useMemo, useState } from 'react';
import { http } from '@/lib/http';
import { toParams } from '@/lib/utils';

// 사용자 그룹 관리 - MMSM08008E
// 필터: USR_GRP_NM(사용자그룹명), USE_YN(사용여부)
// 기능: 조회, 추가, 수정, 삭제, 저장

type Row = {
  USR_GRP_CD?: string;
  USR_GRP_NM?: string;
  DSP_SEQ?: number | string;
  DESC?: string;
  USE_YN?: 'Y' | 'N' | '';
  _chk?: boolean; // grid selection
  _isNew?: boolean;
  _dirty?: boolean;
};

export default function MMSM08008E() {
  // Filters
  const [searchName, setSearchName] = useState('');
  const [searchUseYn, setSearchUseYn] = useState<'*' | 'Y' | 'N'>('*');

  // Data & UI
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anyDirty = useMemo(
    () => rows.some((r) => r._dirty || r._isNew),
    [rows]
  );
  const anyChecked = useMemo(() => rows.some((r) => r._chk), [rows]);

  async function onSearch() {
    setLoading(true);
    setError(null);

    try {
      const paramObj = {
        usr_grp_nm: searchName,
        use_yn: searchUseYn !== '*' ? searchUseYn : undefined,
      };
      const params = toParams(paramObj);

      const url =
        `/api/m08/mmsm08008/list` +
        (params.toString() ? `?${params.toString()}` : '');

      const data = await http<Row[]>(url);
      const list = (Array.isArray(data) ? data : []).map((r, i) => ({
        USR_GRP_CD: r.USR_GRP_CD ?? '',
        USR_GRP_NM: r.USR_GRP_NM ?? '',
        DSP_SEQ: r.DSP_SEQ ?? '',
        DESC: r.DESC ?? '',
        USE_YN: (r.USE_YN as 'Y' | 'N') ?? 'Y',
        _chk: false,
        _isNew: false,
        _dirty: false,
      }));
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onAdd() {
    setRows((prev) => [
      {
        USR_GRP_CD: '',
        USR_GRP_NM: '',
        DSP_SEQ: '',
        DESC: '',
        USE_YN: 'Y',
        _chk: false,
        _isNew: true,
        _dirty: true,
      },
      ...prev,
    ]);
  }

  function updateCell(idx: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch, _dirty: true } : r))
    );
  }

  function onToggleAll(checked: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, _chk: checked })));
  }

  function validate(rowsToSave: Row[]): string[] {
    const errs: string[] = [];
    rowsToSave.forEach((r, i) => {
      const rowNo = i + 1;
      if (!r.USR_GRP_NM || !String(r.USR_GRP_NM).trim())
        errs.push(`${rowNo}행: 사용자그룹명은 필수입니다.`);
      if (
        r.DSP_SEQ === undefined ||
        r.DSP_SEQ === null ||
        String(r.DSP_SEQ).trim() === ''
      )
        errs.push(`${rowNo}행: 표시순서는 필수입니다.`);
      if (r.DSP_SEQ !== undefined && r.DSP_SEQ !== null) {
        const n = Number(r.DSP_SEQ);
        if (!Number.isFinite(n) || n < 0)
          errs.push(`${rowNo}행: 표시순서는 0 이상의 숫자여야 합니다.`);
      }
      if (!r.USE_YN || (r.USE_YN !== 'Y' && r.USE_YN !== 'N'))
        errs.push(`${rowNo}행: 사용여부는 Y/N 이어야 합니다.`);
    });
    return errs;
  }

  async function onSave() {
    const targets = rows.filter((r) => r._dirty || r._isNew);
    if (targets.length === 0) return;
    const errs = validate(targets);
    if (errs.length > 0) {
      alert(errs.join('\n'));
      return;
    }
    if (!confirm(`총 ${targets.length}건 저장하시겠습니까?`)) return;

    setLoading(true);
    setError(null);
    try {
      const payload = targets.map((r) => ({
        USR_GRP_CD: r.USR_GRP_CD ?? '',
        USR_GRP_NM: r.USR_GRP_NM ?? '',
        DSP_SEQ: Number(r.DSP_SEQ ?? 0),
        DESC: r.DESC ?? '',
        USE_YN: r.USE_YN ?? 'Y',
        _isNew: !!r._isNew,
      }));
      const res = await http<any>(`/api/m08/mmsm08008/save`, {
        method: 'POST',
        body: { rows: payload },
      });
      void res;
      await onSearch();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    const targets = rows.filter((r) => r._chk && (r.USR_GRP_CD || r._isNew));
    if (targets.length === 0) {
      alert('삭제할 항목을 선택하세요.');
      return;
    }
    if (!confirm(`총 ${targets.length}건 삭제하시겠습니까?`)) return;

    setLoading(true);
    setError(null);
    try {
      const newOnes = targets.filter((r) => r._isNew);
      const persisted = targets.filter((r) => !r._isNew && r.USR_GRP_CD);
      // 즉시 제거 가능한 신규행 제거
      let next = rows.filter((r) => !r._chk || !r._isNew);
      setRows(next);
      if (persisted.length > 0) {
        const keys = persisted.map((r) => ({ USR_GRP_CD: r.USR_GRP_CD }));
        const res = await http<any>(`/api/m08/mmsm08008/delete`, {
          method: 'POST',
          body: { rows: keys },
        });
        void res;
        next = next.filter(
          (r) => !persisted.some((p) => p.USR_GRP_CD === r.USR_GRP_CD)
        );
        await onSearch();
      }
      if (newOnes.length > 0 && persisted.length === 0) {
        // 이미 화면에서 제거되었음
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function onClose() {
    try {
      window.dispatchEvent(new CustomEvent('MMSM08008E:CLOSE'));
    } catch {}
    try {
      window.parent &&
        window.parent !== window &&
        window.parent.postMessage({ type: 'MMSM08008E_CLOSE' }, '*');
    } catch {}
    try {
      window.opener &&
        window.opener.postMessage({ type: 'MMSM08008E_CLOSE' }, '*');
    } catch {}
  }

  return (
    <div className="p-3 space-y-3" style={{ width: 640 }}>
      <div className="text-base font-semibold">사용자 그룹</div>

      {/* Filters & Toolbar */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">사용자그룹명</span>
          <input
            className="h-8 border rounded px-2 w-40"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">사용여부</span>
          <select
            className="h-8 border rounded px-2 w-24"
            value={searchUseYn}
            onChange={(e) => setSearchUseYn(e.target.value as any)}
          >
            <option value="*">전체</option>
            <option value="Y">사용</option>
            <option value="N">미사용</option>
          </select>
        </label>
        <div className="ml-auto flex gap-2">
          <button
            onClick={onSearch}
            disabled={loading}
            className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50"
          >
            조회
          </button>
          <button onClick={onAdd} className="h-8 px-3 border rounded">
            추가
          </button>
          <button
            onClick={onSave}
            disabled={!anyDirty || loading}
            className="h-8 px-3 border rounded"
          >
            저장
          </button>
          <button
            onClick={onDelete}
            disabled={!anyChecked || loading}
            className="h-8 px-3 border rounded"
          >
            삭제
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 rounded p-2">
          {error}
        </div>
      )}

      {/* Grid */}
      <div
        className="border rounded overflow-auto max-h-[60vh]"
        style={{ height: 300 }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="w-12 p-2 text-center">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((r) => r._chk)}
                  onChange={(e) => onToggleAll(e.target.checked)}
                />
              </th>
              <th className="w-12 p-2 text-center">No.</th>
              <th className="w-36 p-2 text-center">사용자그룹코드</th>
              <th className="w-40 p-2 text-left">사용자그룹명</th>
              <th className="w-20 p-2 text-center">표시순서</th>
              <th className="p-2 text-left">설명</th>
              <th className="w-20 p-2 text-center">사용여부</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={(r.USR_GRP_CD || '') + ':' + i} className="border-b">
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!r._chk}
                    onChange={(e) => updateCell(i, { _chk: e.target.checked })}
                  />
                </td>
                <td className="p-2 text-center">{i + 1}</td>
                <td className="p-2 text-center">
                  <input
                    className="h-8 border rounded px-2 w-full bg-muted/30"
                    value={r.USR_GRP_CD ?? ''}
                    readOnly
                  />
                </td>
                <td className="p-2">
                  <input
                    className="h-8 border rounded px-2 w-full"
                    value={r.USR_GRP_NM ?? ''}
                    onChange={(e) =>
                      updateCell(i, { USR_GRP_NM: e.target.value })
                    }
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    className="h-8 border rounded px-2 w-full text-center"
                    value={r.DSP_SEQ ?? ''}
                    onChange={(e) =>
                      updateCell(i, {
                        DSP_SEQ: e.target.value.replace(/[^0-9]/g, ''),
                      })
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    className="h-8 border rounded px-2 w-full"
                    value={r.DESC ?? ''}
                    onChange={(e) => updateCell(i, { DESC: e.target.value })}
                  />
                </td>
                <td className="p-2 text-center">
                  <select
                    className="h-8 border rounded px-2 w-full"
                    value={r.USE_YN ?? 'Y'}
                    onChange={(e) =>
                      updateCell(i, { USE_YN: e.target.value as 'Y' | 'N' })
                    }
                  >
                    <option value="Y">사용</option>
                    <option value="N">미사용</option>
                  </select>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="p-3 text-center text-muted-foreground"
                >
                  데이터가 없습니다. 조건을 입력하고 조회하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button onClick={onClose} className="h-8 px-3 border rounded">
          닫기
        </button>
      </div>
    </div>
  );
}
