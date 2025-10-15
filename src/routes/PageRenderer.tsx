// ==============================
// src/routes/PageRenderer.tsx
// 파일 기반 라우터: /app/* → /src/pages/* 를 동적으로 임포트하여 렌더
// - base: URL 상의 베이스 경로 (예: /app)
// - pagesDir: 실제 소스 디렉토리 (예: /src/pages)
// - fallback: 경로가 비어있거나 없을 때 사용할 기본 파일명 (예: default)
// ==============================
import { Suspense, lazy, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// Vite의 import.meta.glob로 pages 디렉토리 전체를 동적 import 매핑
const modules = import.meta.glob('/src/pages/**/*.tsx', { eager: false });

function normalizeKey(k: string) {
  // 예: "/src/pages/M00/a.tsx" → "m00/a"
  return k
    .replace(/^\/?src\/pages\//i, '')
    .replace(/\.tsx$/i, '')
    .toLowerCase();
}

export default function PageRenderer({
  base = '/app',
  pagesDir = '/src/pages',
  fallback = 'default',
}: {
  base?: string;
  pagesDir?: string;
  fallback?: string;
}) {
  const { pathname } = useLocation();

  // URL → pages 하위 파일 경로 계산
  const sub = useMemo(() => {
    const p = pathname.startsWith(base)
      ? pathname.slice(base.length)
      : pathname;
    const s = p.replace(/^\/+/, ''); // 선행 슬래시 제거
    return s.length === 0 ? fallback : s; // 빈 경로면 fallback
  }, [pathname, base, fallback]);

  // 케이스 불일치 대비: 전체 매핑을 소문자 키로 정규화
  const map = useMemo(() => {
    const m: Record<string, () => Promise<any>> = {};
    Object.entries(modules).forEach(([k, loader]) => {
      m[normalizeKey(k)] = loader as () => Promise<any>;
    });
    return m;
  }, []);

  // 요청된 경로에 대응하는 파일을 찾아 Lazy 컴포넌트 생성
  const key = `${sub}`.toLowerCase();
  const filePath = Object.keys(map).includes(key) ? key : undefined;

  if (!filePath) {
    return (
      <div className="p-4 text-sm text-destructive">
        해당 페이지 파일을 찾을 수 없습니다:{' '}
        <code>{`${pagesDir}/${sub}.tsx`}</code>
      </div>
    );
  }

  const LazyComp = lazy(async () => {
    const mod = await map[filePath]!();
    // default export 우선, 없으면 첫 번째 export 선택
    const Comp = mod.default ?? Object.values(mod)[0];
    return { default: Comp };
  });

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted-foreground">
          페이지 불러오는 중...
        </div>
      }
    >
      <LazyComp />
    </Suspense>
  );
}
