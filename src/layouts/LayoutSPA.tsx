import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, useNavigate, NavLink, Navigate, useLocation } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import PageRenderer from '@/routes/PageRenderer';
import type { UserPayload, TreeNode } from '@/lib/menuInfo';
import { sanitizeNavPayload, sanitizeUserPayload, toSafeTree } from '@/lib/guards';
import { filterTreeByRole } from '@/lib/acl';
import { ensureMaskedPage, setMaskedPage, getMaskedPage } from '@/app/routeMask';
import { EmptyPageResult, PAGE_SIZE, toPageResult, type PageResult } from '@/lib/pagination';
import { getApiDataFetch, type FetchRequest } from '@/services/common/getApiFetch';
import TopMenu from './TopMenu';
import TreeMenu from './TreeMenu';

type AuthFetchForm = Record<string, never>;

type RowItem = {
  dspSeq: string;
  lvl: string;
  menuGb: string;
  menuId: string;
  menuNm: string;
  pgmId: string;
  pgmUrl: string;
  topMenu: string;
};

type ResultList = PageResult<RowItem>;

const fetchMe = getApiDataFetch<AuthFetchForm, UserPayload>({
  apiPath: '/api/v1/auth/me',
  mapParams: () => ({}),
});

const fetchMenuPgmInfoList = getApiDataFetch<AuthFetchForm, RowItem[]>({
  apiPath: '/api/v1/auth/menu/searchMenuPgmInfoList',
  mapParams: () => ({}),
});

export const LoadingBlock = ({ text = '불러오는 중...' }) => (
  <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
    <div className="animate-spin h-4 w-4 rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
    <span>{text}</span>
  </div>
);
export const ErrorBlock = ({ error, onRetry }: { error: unknown; onRetry?: () => void }) => (
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

export default function LayoutSPA() {
  const location = useLocation();
  const [maskVersion, setMaskVersion] = useState(0);
  const lastMaskedRef = useRef<string | undefined>(undefined);
  const initLoadedRef = useRef(false);
  const [user, setUser] = useState<UserPayload['user'] | null>(null);
  const [menuResult, setMenuResult] = useState<ResultList>(() => EmptyPageResult(0, PAGE_SIZE));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const request: FetchRequest<AuthFetchForm> = { form: {} };
      const [me, menuRows] = await Promise.all([fetchMe(request), fetchMenuPgmInfoList(request)]);

      setUser(sanitizeUserPayload(me));
      setMenuResult(toPageResult<RowItem>(menuRows, 0, menuRows.length || PAGE_SIZE));
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

  const nav = useMemo(() => sanitizeNavPayload({ data: menuResult.content }), [menuResult]);

  const menuData = useMemo<TreeNode[]>(() => {
    const tree = nav.tree ?? [];
    const roles = user?.roles?.filter(Boolean) ?? [];
    if (roles.length === 0) return tree;
    return filterTreeByRole(tree, roles);
  }, [nav, user]);

  const topMenuItems = useMemo(
    () =>
      nav.menu
        .filter((item) => item.lvl === 1)
        .sort((a, b) => a.dspSeq - b.dspSeq)
        .map((item) => ({
          ...item,
          children: nav.menu
            .filter((child) => child.topMenu === item.menuid)
            .sort((a, b) => a.dspSeq - b.dspSeq),
        })),
    [nav]
  );

  const onOpenPath = (path?: string) => {
    if (!path) return;
    const pageId = path.replace(/^.*\//, '').replace(/\.ts$/i, '');
    setMaskedPage(pageId, navigate, { replace: false });
  };

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

  useEffect(() => {
    const masked = (location.state as any)?.maskedPage as string | undefined;
    if (masked !== undefined && masked !== lastMaskedRef.current) {
      lastMaskedRef.current = masked;
      setMaskVersion((v) => v + 1);
    }
  }, [location.state]);

  useEffect(() => {
    const onMaskedChange = (e: Event) => {
      const pageId = (e as CustomEvent).detail?.pageId as string | undefined;
      if (pageId && pageId !== lastMaskedRef.current) {
        lastMaskedRef.current = pageId;
        setMaskVersion((v) => v + 1);
      }
    };
    window.addEventListener('maskedpagechange', onMaskedChange as EventListener);
    return () => window.removeEventListener('maskedpagechange', onMaskedChange as EventListener);
  }, []);

  const maskedPage = useMemo(() => {
    return ((location.state as any)?.maskedPage as string | undefined) || getMaskedPage();
  }, [location.state, maskVersion]);

  return (
    <div className="h-[100vh] w-full bg-background text-foreground">
      <header className="border-b">
        <div className="h-12 flex items-center justify-between px-3">
          <NavLink to="/app/default.ts" className="font-semibold tracking-tight">
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
          <TopMenu items={topMenuItems} />
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
                  <TreeMenu nodes={toSafeTree(menuData)} onOpen={onOpenPath} masked={maskedPage} />
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

