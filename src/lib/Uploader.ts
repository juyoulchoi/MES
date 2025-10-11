import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function Uploader() {
  const [file, setFile] = useState<File | null>(null);

  const onUpload = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'include', // 세션 모드
      body: fd,
    });
    if (!res.ok) alert('업로드 실패');
    else alert('완료');
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <Button onClick={onUpload}>업로드</Button>
    </div>
  );
}
