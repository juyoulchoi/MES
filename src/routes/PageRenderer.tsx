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
const modules = import.meta.glob('@/pages/**/*.tsx', { eager: false });

// 2) 모듈 키 정규화: /src/pages/..., @/pages/... 모두 커버
function normalizeKey(k: string) {
  return k
    .replace(/^@?\/*src\/pages\//i, '') // "@/pages/" 혹은 "/src/pages/" 제거
    .replace(/\.tsx$/i, '')
    .replace(/^[\/]+|[\/]+$/g, '') // 앞/뒤 슬래시 제거
    .toLowerCase();
}

// 3) URL 경로 정규화
function normalizeUrlPath(p: string) {
  return p
    .replace(/^[\/]+|[\/]+$/g, '') // 앞/뒤 슬래시 제거
    .replace(/\.ts$/i, '') // 표시용 .ts 확장자 제거
    .toLowerCase(); // 소문자화
}

export default function PageRenderer({
  base = '/app',
  pagesDir = '@/pages',
  fallback = 'Default',
  maskVersion = 0,
}: {
  base?: string;
  pagesDir?: string;
  fallback?: string;
  maskVersion?: number;
}) {
  const location = useLocation();
  const { pathname, state } = location as { pathname: string; state?: any };

  // URL → pages 하위 파일 경로 계산
  const sub = useMemo(() => {
    // 기본 계산
    const raw = pathname.startsWith(base)
      ? pathname.slice(base.length)
      : pathname;
    const trimmed = normalizeUrlPath(raw);
    const baseSub = trimmed.length === 0 ? fallback : trimmed;
    // 마스킹: /app/default.ts & sessionStorage.maskedPage 존재 시 실제 페이지로 교체
    if (/\/default\.ts$/i.test(pathname)) {
      const stateMasked: string | undefined = state?.maskedPage;
      const masked = stateMasked ?? sessionStorage.getItem('maskedPage');
      if (masked && masked !== 'default') {
        return masked.toLowerCase();
      }
    }
    return baseSub;
  }, [pathname, base, fallback, maskVersion, state]);

  // 케이스 불일치 대비: 전체 매핑을 소문자 키로 정규화
  const map = useMemo(() => {
    const m: Record<string, () => Promise<any>> = {};
    Object.entries(modules).forEach(([k, loader]) => {
      m[normalizeKey(k)] = loader as () => Promise<any>;
    });
    return m;
  }, []);

  // basename → fullKey 매핑 (폴더 숨김용)
  const baseNameMap = useMemo(() => {
    const b: Record<string, string> = {};
    Object.keys(map).forEach((full) => {
      const parts = full.split('/');
      const name = parts[parts.length - 1];
      // 중복 basename은 첫 번째만 유지 (필요시 충돌 처리 확장 가능)
      if (!b[name]) b[name] = full;
    });
    return b;
  }, [map]);
  // 요청된 경로에 대응하는 파일을 찾아 Lazy 컴포넌트 생성
  const key = sub; // 이미 소문자/슬래시정리 완료
  const candidates = [key, `${key}/index`];
  let filePath = candidates.find((c) => c in map);

  // 폴더명 숨김: /app/mmsm08002s → m08/mmsm08002s 매핑 (basename 검색)
  if (!filePath && !key.includes('/')) {
    const byBase = baseNameMap[key];
    if (byBase) filePath = byBase;
  }

  if (!filePath) {
    // 비슷한 경로 힌트 (선택)
    const hints = Object.keys(map)
      .filter((k) => k.startsWith(key.split('/')[0])) // 같은 루트만 힌트
      .slice(0, 5);

    return (
      <div className="p-4 text-sm text-destructive">
        해당 페이지 파일을 찾을 수 없습니다:{' '}
        <code>{`${pagesDir}/${key}.tsx`}</code>
        {key.endsWith('/') ? ' (끝의 "/"를 제거해 보세요)' : null}
        {hints.length > 0 && (
          <div className="mt-2 text-muted-foreground">
            혹시 아래 파일이 있나요?
            <ul className="list-disc ml-4">
              {hints.map((h) => (
                <li key={h}>
                  <code>{`${pagesDir}/${h}.tsx`}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const LazyComp = lazy(async () => {
    const mod = await map[filePath]!();
    // default export가 없으면 컴포넌트를 찾을 수 없다고 명시적으로 에러
    const Comp = mod.default ?? null;
    if (!Comp) {
      throw new Error(`"${filePath}.tsx"에 default export가 없습니다.`);
    }
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
      {/* key로 경로 변경 시 강제 remount → 화면 교체 확실화 */}
      <LazyComp key={filePath} />
    </Suspense>
  );
}
