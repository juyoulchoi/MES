import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Routes,
  Route,
  NavLink,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MenuItem, NavPayload, TreeNode, UserPayload } from '@/lib/types';

/**
 * 목적
 * - WebForms 의 iframe 내비게이션을 제거하고 React Router 기반 SPA 로 전환
 * - 메뉴/트리 데이터를 API에서 동적 로딩 (로딩/에러/재시도 처리)
 * - 사용자 권한(roles)에 따른 메뉴/트리 필터링
 * - 좌측 트리 + 상단 메뉴 + 중앙 라우팅 컨텐츠 레이아웃 유지
 *
 * 사전 요구
 * - npm i react-router-dom react-resizable-panels
 * - shadcn/ui: button, scroll-area, separator 설치 완료
 * - Tailwind 환경
 *
 * API 계약(예시)
 * GET /api/me           → { user: { name: string, roles: string[] } }
 * GET /api/nav          → { menu: MenuItem[], tree: TreeNode[] }
 * 타입: MenuItem = { id, label, path, icon?, roles?: string[] }
 *       TreeNode = { id, label, path?, children?: TreeNode[], roles?: string[] }
 */

// ================== 간단 Fetch 래퍼 ==================
async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`);
  return res.json();
}

// 공통 로딩 블록
function LoadingBlock({ text = '불러오는 중...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
      <div className="animate-spin h-4 w-4 rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
      <span>{text}</span>
    </div>
  );
}

// 공통 에러 블록
function ErrorBlock({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-destructive/5 border border-destructive/20 rounded-md p-3">
      <div className="flex items-center gap-2 text-destructive text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>{error instanceof Error ? error.message : String(error)}</span>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}

// ================== 권한 유틸 ==================
function hasAccess(
  allowRoles: string[] | undefined,
  userRoles: string[]
): boolean {
  if (!allowRoles || allowRoles.length === 0) return true; // 지정 없으면 모두 허용
  return allowRoles.some((r) => userRoles.includes(r));
}

function filterMenuByRole(items: MenuItem[], roles: string[]): MenuItem[] {
  return items.filter((m) => hasAccess(m.roles, roles));
}

function filterTreeByRole(nodes: TreeNode[], roles: string[]): TreeNode[] {
  return nodes
    .map((n) => ({
      ...n,
      children: n.children ? filterTreeByRole(n.children, roles) : undefined,
    }))
    .filter((n) => {
      const self = hasAccess(n.roles, roles);
      const hasVisibleChild = (n.children?.length ?? 0) > 0;
      // 폴더 노드는 자식이 보이면 통과, 아니면 자기 자신 권한으로 판단
      return hasVisibleChild || self;
    });
}

// ================== 트리 컴포넌트 ==================
function Tree({
  nodes,
  onOpen,
  className,
}: {
  nodes: TreeNode[];
  onOpen?: (path?: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('text-sm', className)}>
      {nodes.map((n) => (
        <TreeItem key={n.id} node={n} onOpen={onOpen} />
      ))}
    </div>
  );
}

function TreeItem({
  node,
  onOpen,
}: {
  node: TreeNode;
  onOpen?: (path?: string) => void;
}) {
  const [open, setOpen] = useState(!!node.defaultExpanded);
  const hasChildren = !!node.children?.length;

  const handleClick = () => {
    if (hasChildren) setOpen((o) => !o);
    else onOpen?.(node.path);
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-md hover:bg-muted cursor-pointer',
          !hasChildren && 'pl-6'
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
        <span>{node.label}</span>
      </div>
      {hasChildren && open && (
        <div className="ml-4 border-l pl-2">
          {node.children!.map((c) => (
            <TreeItem key={c.id} node={c} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

// ================== 페이지(라우트) 샘플 ==================
function IntroPage() {
  return <div className="p-4">인트로 페이지</div>;
}
function DashboardPage() {
  return <div className="p-4">대시보드</div>;
}
function ReportsPage() {
  return <div className="p-4">리포트</div>;
}
function NotFoundPage() {
  const nav = useNavigate();
  return (
    <div className="p-6 space-y-3">
      <h2 className="text-lg font-semibold">페이지를 찾을 수 없습니다.</h2>
      <Button onClick={() => nav('/')}>홈으로 가기</Button>
    </div>
  );
}

// ================== 상단 메뉴 컴포넌트 ==================
function TopMenu({ items }: { items: MenuItem[] }) {
  const location = useLocation();
  return (
    <nav className="h-10 flex items-center px-2 border-b bg-background/50 backdrop-blur">
      <div className="flex items-center gap-1 w-full overflow-x-auto">
        {items.map((m) => (
          <NavLink
            key={m.id}
            to={m.path}
            className={({ isActive }) =>
              cn(
                'px-3 h-8 inline-flex items-center text-sm',
                isActive || location.pathname.startsWith(m.path)
                  ? 'font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {m.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// ================== 레이아웃 ==================
function LayoutSPA() {
  const [user, setUser] = useState<UserPayload['user'] | null>(null);
  const [nav, setNav] = useState<NavPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    try {
      const [me, nav] = await Promise.all([
        getJSON<UserPayload>('/api/me', ac.signal),
        getJSON<NavPayload>('/api/nav', ac.signal),
      ]);
      setUser(me.user);
      setNav(nav);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
    return () => ac.abort();
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const roles = user?.roles ?? [];
    const menu = filterMenuByRole(nav?.menu ?? [], roles);
    const tree = filterTreeByRole(nav?.tree ?? [], roles);
    return { menu, tree };
  }, [nav, user]);

  const navigate = useNavigate();
  const onOpenPath = (path?: string) => path && navigate(path);

  return (
    <div className="h-[100vh] w-full bg-background text-foreground">
      {/* 헤더 */}
      <header className="border-b">
        <div className="h-12 flex items-center justify-between px-3">
          <a href="/" className="font-semibold tracking-tight">
            SSMH
          </a>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <span className="font-semibold">{user.name} 님 로그인</span>
            ) : (
              <span className="text-muted-foreground">게스트</span>
            )}
            <a href="/logout" className="underline">
              Logout
            </a>
          </div>
        </div>
        {loading ? (
          <LoadingBlock text="메뉴 불러오는 중..." />
        ) : error ? (
          <div className="px-3">
            <ErrorBlock error={error} onRetry={load} />
          </div>
        ) : (
          <TopMenu items={filtered.menu} />
        )}
      </header>

      {/* 본문 Splitter */}
      <PanelGroup direction="horizontal" className="h-[calc(100vh-88px)]">
        {/* Left: Tree */}
        <Panel defaultSize={20} minSize={12} collapsible>
          <div className="h-full bg-muted/30">
            <div className="p-1 h-full flex flex-col">
              <div className="text-sm font-medium px-2 py-1">메뉴</div>
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
                    nodes={filtered.tree}
                    onOpen={onOpenPath}
                    className="py-1"
                  />
                </ScrollArea>
              )}
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="w-[1px] bg-border" />

        {/* Center: Router Outlet */}
        <Panel minSize={40} defaultSize={80}>
          <div className="h-full">
            <Routes>
              <Route path="/" element={<IntroPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              {/* 실제 서비스 라우트 추가: API의 path 값과 매핑 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
}

// ================== 루트(App) ==================
