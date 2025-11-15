import { useRef, useState } from 'react';

// 파일 업로드 (MMSM06010E)
// 상단: 파일명 표시 + 파일선택 + 업로드
// ASPX에 그리드/저장 없음 → 단일 업로드 동작만 구현

export default function MMSM06010E() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openPicker() {
    setResult(null); setError(null);
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setFileName(f?.name || '');
  }

  async function onUpload() {
    if (!file) { setError('업로드할 파일을 선택하세요.'); return; }
    setUploading(true); setError(null); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('file_name', file.name);
      // 엔드포인트 가정: /api/m06/mmsm06010/upload
      const res = await fetch('/api/m06/mmsm06010/upload', { method: 'POST', body: fd, credentials: 'same-origin' });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `HTTP ${res.status}`);
      }
      if (ct.includes('application/json')) {
        const json = await res.json();
        setResult(typeof json === 'string' ? json : JSON.stringify(json));
      } else {
        const text = await res.text();
        setResult(text || '업로드가 완료되었습니다.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setUploading(false); }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-base font-semibold">파일 업로드</div>

      {/* File select row */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span className="mb-1">파일명</span>
          <input className="h-8 border rounded px-2 w-80 bg-muted" value={fileName} readOnly placeholder="파일을 선택하세요" />
        </label>
        <div className="ml-auto flex gap-2">
          <button onClick={openPicker} disabled={uploading} className="h-8 px-3 border rounded">파일선택</button>
          <button onClick={onUpload} disabled={uploading || !file} className="h-8 px-3 border rounded bg-primary text-primary-foreground disabled:opacity-50">업로드</button>
        </div>
        <input ref={inputRef} type="file" className="hidden" onChange={onFileChange} />
      </div>

      {error && <div className="text-sm text-destructive border border-destructive/30 rounded p-2">{error}</div>}
      {result && <div className="text-sm border rounded p-2 whitespace-pre-wrap">{result}</div>}
    </div>
  );
}
