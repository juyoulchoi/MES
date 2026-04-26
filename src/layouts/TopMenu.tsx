import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getMaskedPage, setMaskedPage } from '@/app/routeMask';
import { cn } from '@/lib/utils';
import type { MenuItem } from '@/lib/menuInfo';

type TopMenuNode = MenuItem & { children?: MenuItem[] };
type AnchorPos = { left: number; top: number; width: number; height: number };

const getBaseName = (p?: string) => (p || '').replace(/^.*\//, '').replace(/\.ts$/i, '');

function isWithinOpenArea(
  to: Node | null,
  navRef: React.RefObject<HTMLDivElement | null>,
  dropdownRef: React.RefObject<HTMLDivElement | null>
): boolean {
  if (!to) return false;
  return Boolean(
    (dropdownRef.current && dropdownRef.current.contains(to)) ||
    (navRef.current && navRef.current.contains(to))
  );
}

export default function TopMenu({ items }: { items?: TopMenuNode[] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const navRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const anchorRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [anchorPos, setAnchorPos] = useState<AnchorPos | null>(null);

  const [masked, setMasked] = useState<string | undefined>(() => getMaskedPage() ?? undefined);
  useEffect(() => {
    setMasked(getMaskedPage() ?? undefined);
  }, [location.state]);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail?.pageId as string | undefined;
      setMasked(id ?? getMaskedPage() ?? undefined);
    };
    window.addEventListener('maskedpagechange', handler as EventListener);
    return () => window.removeEventListener('maskedpagechange', handler as EventListener);
  }, []);

  const isTopActive = (m: TopMenuNode) => {
    if (openId === m.menuid) return true; // 드롭다운이 열려있으면 활성 표시
    const self = getBaseName(m.path);
    if (masked && self && self === masked) return true;
    if (Array.isArray(m.children) && m.children.length > 0) {
      return m.children.some((c) => getBaseName(c.path) === masked);
    }
    return false;
  };

  // 드롭다운 포털 렌더링 (JSX 바깥에서)
  let dropdownPortal: React.ReactPortal | null = null;
  if (openId && anchorPos) {
    const current = list.find((x) => x.menuid === openId);
    if (current && current.children && current.children.length > 0) {
      const dropdownWidth = Math.max(220, anchorPos.width);
      let left = anchorPos.left + anchorPos.width / 2 - dropdownWidth / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - dropdownWidth - 8));
      const top = anchorPos.top + anchorPos.height + 4;
      dropdownPortal = createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            left,
            top,
            minWidth: dropdownWidth,
          }}
          className="max-h-[60vh] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md z-[1000]"
          onMouseLeave={(e) => {
            const to = e.relatedTarget as Node | null;
            if (isWithinOpenArea(to, navRef, dropdownRef)) {
              return;
            }
            setOpenId(null);
            setAnchorPos(null);
          }}
        >
          <ul className="py-1 text-sm">
            {current.children.map((c) => (
              <li key={c.menuid}>
                <NavLink
                  to={c.path}
                  className={({ isActive }) =>
                    cn(
                      'block w-full text-left px-3 py-2 hover:bg-muted rounded-md',
                      getBaseName(c.path) === masked || isActive
                        ? 'font-semibold bg-accent text-accent-foreground'
                        : undefined
                    )
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    const pid = getBaseName(c.path);
                    if (pid) setMaskedPage(pid, navigate, { replace: false });
                    setOpenId(null);
                    setAnchorPos(null);
                  }}
                >
                  {String(c.menunm)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      );
    }
  }

  return (
    <nav ref={navRef} className="flex gap-4 items-center h-12 px-4 select-none relative z-20">
      {list.map((m) => {
        const hasChildren = Array.isArray(m.children) && m.children.length > 0;
        return (
          <div key={m.menuid} className="relative">
            <button
              type="button"
              ref={(el) => {
                anchorRefs.current[m.menuid] = el;
              }}
              className={cn(
                'px-4 py-2 rounded-md font-medium transition-colors',
                isTopActive(m)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                hasChildren ? 'cursor-pointer' : ''
              )}
              onMouseEnter={() => {
                if (hasChildren) {
                  const el = anchorRefs.current[m.menuid];
                  if (el) {
                    const r = el.getBoundingClientRect();
                    setAnchorPos({
                      left: r.left,
                      top: r.top,
                      width: r.width,
                      height: r.height,
                    });
                  }
                  setOpenId(m.menuid);
                }
              }}
              onMouseLeave={(e) => {
                const to = e.relatedTarget as Node | null;
                if (isWithinOpenArea(to, navRef, dropdownRef)) {
                  return;
                }
                setOpenId(null);
                setAnchorPos(null);
              }}
              onClick={() => {
                if (hasChildren) {
                  setOpenId((id) => {
                    const next = id === m.menuid ? null : m.menuid;
                    if (next) {
                      const el = anchorRefs.current[m.menuid];
                      if (el) {
                        const r = el.getBoundingClientRect();
                        setAnchorPos({
                          left: r.left,
                          top: r.top,
                          width: r.width,
                          height: r.height,
                        });
                      }
                    } else {
                      setAnchorPos(null);
                    }
                    return next;
                  });
                } else {
                  // 하위 메뉴 없는 경우 바로 이동
                  const pid = getBaseName(m.path);
                  if (pid) setMaskedPage(pid, navigate, { replace: false });
                }
              }}
            >
              {String(m.menunm)}
            </button>
          </div>
        );
      })}
      {/* 드롭다운 포털 */}
      {dropdownPortal}
    </nav>
  );
}
