import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Routes,
  Route,
  useNavigate,
  NavLink,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import PageRenderer from '@/routes/PageRenderer';
import type {
  NavPayload,
  UserPayload,
  TreeNode,
  UINode,
  MenuItem,
} from '@/lib/types';
import { http } from '@/lib/http';
import { sanitizeNavPayload, toSafeTree } from '@/lib/guards';
import { filterTreeByRole } from '@/lib/acl';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ensureMaskedPage,
  setMaskedPage,
  getMaskedPage,
} from '@/app/routeMask';
import TopMenu from './TopMenu';

// 로딩/에러 컴포넌트
export const LoadingBlock = ({ text = '불러오는 중...' }) => (
  <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
    <div className="animate-spin h-4 w-4 rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
    <span>{text}</span>
  </div>
);
export const ErrorBlock = ({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) => (
  <div className="flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-md p-3">
    <div className="flex items-center gap-2 text-destructive text-sm">
      <span>⚠️</span>
      <span>{error instanceof Error ? error.message : String(error)}</span>
    </div>
    {onRetry && (
      <Button size="sm" variant="outline" onClick={onRetry}>
        다시 시도
      </Button>
    )}
  </div>
);

// 좌측 트리
export function Tree({
  nodes,
  onOpen,
  masked,
}: {
  nodes?: UINode[];
  onOpen?: (path?: string) => void;
  masked?: string;
}) {
  const list = Array.isArray(nodes) ? nodes : [];
  return (
    <div className="text-sm">
      {list.map((n) => (
        <TreeItem key={n.menuId} node={n} onOpen={onOpen} masked={masked} />
      ))}
    </div>
  );
}
export function TreeItem({
  node,
  onOpen,
  masked,
}: {
  node: UINode;
  onOpen?: (path?: string) => void;
  masked?: string;
}) {
  const [open, setOpen] = useState(!!node.defaultExpanded);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const handleClick = () => {
    if (hasChildren) setOpen((o) => !o);
    else if (node.path) onOpen?.(node.path);
  };
  const getBaseName = (p?: string) =>
    (p || '').replace(/^.*\//, '').replace(/\.ts$/i, '');
  const isActive =
    !hasChildren && masked && node.path
      ? getBaseName(node.path) === masked
      : false;
  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer',
          !hasChildren && 'pl-6',
          isActive
            ? 'bg-accent text-accent-foreground font-semibold'
            : 'hover:bg-muted',
        )}
        onClick={handleClick}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )
        ) : (
          <span className="inline-block w-4" />
        )}
        <span>{String(node.menuNm)}</span>
      </div>
      {hasChildren && open && (
        <div className="ml-4 border-l pl-2">
          {node.children!.map((c) => (
            <TreeItem key={c.menuId} node={c} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

export function useSmartNav() {
  const navigate = useNavigate();
  return (url?: string | null) => {
    if (!url) return;
    if (url.startsWith('/app/')) {
      navigate(url);
    } else if (/^(https?:)?\/\//i.test(url) || url.startsWith('/')) {
      window.open(url, '_self');
    } else {
      window.open(url, '_self');
    }
  };
}

// 레이아웃
export default function LayoutSPA() {
  const location = useLocation();
  const [maskVersion, setMaskVersion] = useState(0);
  const lastMaskedRef = useRef<string | undefined>(undefined);
  const initLoadedRef = useRef(false);
  const [user, setUser] = useState<UserPayload['user'] | null>(null);
  const [nav, setNav] = useState<NavPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, n] = await Promise.all([
        http<UserPayload>('/api/v1/auth/me'),
        http<unknown>('/api/v1/auth/menu/searchMenuPgmInfoList'),
      ]);
      setUser(me.user);
      setNav(sanitizeNavPayload(n));
    } catch (e) {
      if (e instanceof Error && /\b(401|403)\b/.test(e.message)) {
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
        return;
      }
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (initLoadedRef.current) return;
    initLoadedRef.current = true;
    void load();
  }, [load]);

  const menuData = useMemo<TreeNode[]>(() => {
    const roles = user?.roles ?? [];
    return filterTreeByRole(nav?.tree ?? [], roles);
  }, [nav, user]);

  const onOpenPath = (path?: string) => {
    if (!path) return;
    const pageId = path.replace(/^\/app\//, '').replace(/\.ts$/i, '');
    setMaskedPage(pageId, navigate, { replace: false });
  };

  // DB tree 기반 TOP 메뉴(하위 드롭다운 유지)
  const topMenuItems = useMemo(
    () =>
      menuData.map((m, idx) => ({
        menuId: m.menuId,
        menuNm: m.menuNm,
        path: m.path ?? '',
        pgmId: m.menuId,
        lvl: 1,
        topMenu: '*',
        dspSeq: idx,
        pgmUrl: m.path ?? '',
        children: m.children?.map((c, cIdx) => ({
          menuId: c.menuId,
          menuNm: c.menuNm,
          path: c.path ?? '',
          pgmId: c.menuId,
          lvl: 2,
          topMenu: m.menuId,
          dspSeq: cIdx,
          pgmUrl: c.path ?? '',
        })),
      })),
    [menuData],
  );

  // 주소 마스킹: /app/<page>.ts 접근 시 항상 /app/default.ts로 표시
  useEffect(() => {
    const p = location.pathname;
    if (p === '/app' || p === '/app/') {
      ensureMaskedPage(navigate, 'default', true);
      return;
    }
    if (p.startsWith('/app/') && /\.ts$/i.test(p) && p !== '/app/default.ts') {
      const pageId = p.replace(/^\/app\//, '').replace(/\.ts$/i, '');
      setMaskedPage(pageId, navigate, { replace: true });
      return;
    }
    if (p === '/app/default.ts') {
      const masked = (location.state as any)?.maskedPage || getMaskedPage();
      if (!masked) {
        ensureMaskedPage(navigate, 'default', true);
      }
    }
  }, [location.pathname, navigate]);

  // 마스크 페이지 변경 시 렌더 강제 갱신 (동일 경로 내 상태 변경 대응)
  useEffect(() => {
    const masked = (location.state as any)?.maskedPage as string | undefined;
    if (masked !== undefined && masked !== lastMaskedRef.current) {
      lastMaskedRef.current = masked;
      setMaskVersion((v) => v + 1);
    }
  }, [location.state]);

  // 세션 변경 이벤트 수신 (state 미변경 케이스 보완)
  useEffect(() => {
    const onMaskedChange = (e: Event) => {
      const pageId = (e as CustomEvent).detail?.pageId as string | undefined;
      if (pageId && pageId !== lastMaskedRef.current) {
        lastMaskedRef.current = pageId;
        setMaskVersion((v) => v + 1);
      }
    };
    window.addEventListener(
      'maskedpagechange',
      onMaskedChange as EventListener,
    );
    return () =>
      window.removeEventListener(
        'maskedpagechange',
        onMaskedChange as EventListener,
      );
  }, []);

  const maskedPage = useMemo(() => {
    return (
      ((location.state as any)?.maskedPage as string | undefined) ||
      getMaskedPage()
    );
  }, [location.state, maskVersion]);

  return (
    <div className="h-[100vh] w-full bg-background text-foreground">
      <header className="border-b">
        <div className="h-12 flex items-center justify-between px-3">
          <NavLink
            to="/app/default.ts"
            className="font-semibold tracking-tight"
          >
            SSMH
          </NavLink>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <span className="font-semibold">{String(user.usrNm)} 님</span>
            ) : (
              <span className="text-muted-foreground">게스트</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/login', { replace: true });
              }}
            >
              Logout
            </Button>
          </div>
        </div>
        <div className="w-full flex justify-center">
          <TopMenu />
        </div>
        {loading ? (
          <LoadingBlock text="메뉴 불러오는 중..." />
        ) : error ? (
          <div className="px-3">
            <ErrorBlock error={error} onRetry={load} />
          </div>
        ) : null}
      </header>

      <PanelGroup direction="horizontal" className="h-[calc(100vh-88px)]">
        <Panel defaultSize={20} minSize={12} collapsible>
          <div className="h-full bg-muted/30">
            <div className="p-1 h-full flex flex-col">
              <Separator />
              {loading ? (
                <LoadingBlock text="트리 불러오는 중..." />
              ) : error ? (
                <div className="p-2">
                  <ErrorBlock error={error} onRetry={load} />
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <Tree
                    nodes={toSafeTree(menuData)}
                    onOpen={onOpenPath}
                    masked={maskedPage}
                  />
                </ScrollArea>
              )}
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="w-[1px] bg-border" />
        <Panel minSize={40} defaultSize={80}>
          <Routes>
            <Route index element={<Navigate to="default.ts" replace />} />
            <Route
              path="*"
              element={
                <PageRenderer
                  key={location.pathname.toLowerCase()}
                  base="/app"
                  pagesDir="/app/Default"
                  fallback="default"
                  maskVersion={maskVersion}
                />
              }
            />
          </Routes>
        </Panel>
      </PanelGroup>
    </div>
  );
}
