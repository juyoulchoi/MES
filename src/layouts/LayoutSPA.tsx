import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Routes,
  Route,
  useNavigate,
  NavLink,
  Navigate,
} from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import TopMenu from '@/layouts/TopMenu';
import PageRenderer from '@/routes/PageRenderer';
import type { NavPayload, UserPayload, TreeNode, UINode } from '@/lib/types';
import { http } from '@/lib/http';
import { filterMenuByRole, filterTreeByRole } from '@/lib/acl';
import { sanitizeNavPayload, toSafeTree } from '@/lib/guards';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// 로딩/에러 컴포넌트
const LoadingBlock = ({ text = '불러오는 중...' }) => (
  <div className="flex items-center gap-2 text-muted-foreground text-sm p-3">
    <div className="animate-spin h-4 w-4 rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
    <span>{text}</span>
  </div>
);
const ErrorBlock = ({
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

// 좌측 트리 (문자열 강제 변환으로 #130 방지)
function Tree({
  nodes,
  onOpen,
}: {
  nodes?: UINode[];
  onOpen?: (path?: string) => void;
}) {
  const list = Array.isArray(nodes) ? nodes : [];
  return (
    <div className="text-sm">
      {list.map((n) => (
        <TreeItem key={n.id} node={n} onOpen={onOpen} />
      ))}
    </div>
  );
}
function TreeItem({
  node,
  onOpen,
}: {
  node: UINode;
  onOpen?: (path?: string) => void;
}) {
  const [open, setOpen] = useState(!!node.defaultExpanded);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
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
        <span>{String(node.label)}</span>
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

// 레이아웃
export default function LayoutSPA() {
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
        http<UserPayload>('/api/me'),
        http<unknown>('/api/nav'), // unknown → sanitizeNavPayload 로 안전화
      ]);
      setUser(me.user);
      setNav(sanitizeNavPayload(n));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const roles = user?.roles ?? [];
    return {
      menu: filterMenuByRole(nav?.menu, roles),
      tree: filterTreeByRole(nav?.tree, roles),
    };
  }, [nav, user]);

  const onOpenPath = (path?: string) => {
    if (path) navigate(path);
  };
  // (옵션) 첫 진입 시 /app로 라우팅 보정
  useEffect(() => {
    // /app로 접근했지만 index면 그대로, 그 외 별도 처리 필요 시 여기에
  }, []); // 절대 경로 이동

  return (
    <div className="h-[100vh] w-full bg-background text-foreground">
      <header className="border-b">
        <div className="h-12 flex items-center justify-between px-3">
          <NavLink to="/app/default" className="font-semibold tracking-tight">
            SSMH
          </NavLink>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <span className="font-semibold">{String(user.name)} 님</span>
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

      <PanelGroup direction="horizontal" className="h-[calc(100vh-88px)]">
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
                  <Tree nodes={toSafeTree(filtered.tree)} onOpen={onOpenPath} />
                </ScrollArea>
              )}
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="w-[1px] bg-border" />
        <Panel minSize={40} defaultSize={80}>
          {/* 상대 경로 선언으로 /app/* 중첩 라우팅 처리 */}
          <Routes>
            {/* /app → /app/default 로 리다이렉트 */}
            <Route index element={<Navigate to="default" replace />} />
            {/* 파일 기반 라우팅: /app/* → src/pages/* */}
            <Route
              path="*"
              element={
                <PageRenderer
                  base="/app"
                  pagesDir="/app/default"
                  fallback="default"
                />
              }
            />
          </Routes>
        </Panel>
      </PanelGroup>
    </div>
  );
}
