import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { MenuItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function TopMenu({ items }: { items?: MenuItem[] }) {
  const location = useLocation();
  const list = Array.isArray(items) ? items : [];
  return (
    <nav className="h-10 flex items-center px-2 border-b bg-background/50 backdrop-blur">
      <div className="flex items-center gap-1 w-full overflow-x-auto">
        {list.map((m) => (
          <NavLink
            key={m.id}
            to={m.path} // 절대 경로: "/app/..."
            className={({ isActive }) =>
              cn(
                'px-3 h-8 inline-flex items-center text-sm',
                isActive || location.pathname.startsWith(m.path)
                  ? 'font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {String(m.label)}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
