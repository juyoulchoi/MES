import type { MenuItem, TreeNode, NavPayload, UINode } from './types';

const toStringSafe = (v: unknown): string => {
  try {
    if (typeof v === 'function' || typeof v === 'symbol') return ''; // ⬅️ 추가
    return typeof v === 'string' ? v : v == null ? '' : String(v);
  } catch {
    return '';
  }
};

const toNumberSafe = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const normalizePath = (path: string): string => {
  if (!path) return '';
  const p = path.trim();
  if (!p) return '';
  if (p.startsWith('/app/')) return p.replace(/\.tsx$/i, '.ts');
  const name = p.split('/').filter(Boolean).pop() || '';
  if (!name) return '';
  if (/\.tsx?$/i.test(name)) return `/app/${name.replace(/\.tsx$/i, '.ts')}`;
  return '';
};

const resolvePath = (pgmUrl: string, pgmId: string): string => {
  const byUrl = normalizePath(pgmUrl);
  if (byUrl) return byUrl;
  return pgmId ? `/app/${pgmId}.ts` : '';
};

export function sanitizeMenu(items: unknown): MenuItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw, idx) => {
      if (!raw || typeof raw !== 'object') return null;
      const any = raw as Record<string, unknown>;
      const menuId =
        toStringSafe(any.menuId) ||
        toStringSafe(any.MENU_ID) ||
        toStringSafe(any.id) ||
        `menu-${idx}`;
      const menuNm =
        toStringSafe(any.menuNm) ||
        toStringSafe(any.MENU_NM) ||
        toStringSafe(any.label) ||
        menuId;
      const pgmId =
        toStringSafe(any.pgmId) ||
        toStringSafe(any.PGM_ID) ||
        toStringSafe(any.programId);
      const lvl = toNumberSafe(any.lvl ?? any.LVL, 0);
      const topMenu =
        toStringSafe(any.topMenu) || toStringSafe(any.TOP_MENU) || '*';
      const dspSeq = toNumberSafe(any.dspSeq ?? any.DSP_SEQ, idx);
      const pgmUrl =
        toStringSafe(any.pgmUrl) ||
        toStringSafe(any.PGM_URL) ||
        toStringSafe(any.path);
      const path = resolvePath(pgmUrl, pgmId || menuId);
      const roles = Array.isArray(any.roles)
        ? (any.roles as unknown[]).map(toStringSafe).filter(Boolean)
        : undefined;
      return {
        menuId,
        menuNm,
        path,
        pgmId: pgmId || menuId,
        lvl,
        topMenu,
        dspSeq,
        pgmUrl,
        roles,
      } as MenuItem;
    })
    .filter((x): x is MenuItem => !!x);
}

export function sanitizeTree(nodes: unknown): TreeNode[] {
  if (!Array.isArray(nodes)) return [];
  const looksLikeMenuRows = nodes.some((raw) => {
    if (!raw || typeof raw !== 'object') return false;
    const any = raw as Record<string, unknown>;
    return (
      'menuId' in any ||
      'MENU_ID' in any ||
      'topMenu' in any ||
      'TOP_MENU' in any
    );
  });

  if (looksLikeMenuRows) {
    const menu = sanitizeMenu(nodes);
    if (menu.length === 0) return [];

    const seqById = new Map<string, number>();
    const nodeById = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    for (const m of menu) {
      seqById.set(m.menuId, m.dspSeq);
      nodeById.set(m.menuId, {
        menuId: m.menuId,
        menuNm: m.menuNm,
        path: m.path || undefined,
        roles: m.roles,
        defaultExpanded: m.lvl <= 1,
        children: [],
      });
    }

    for (const m of menu) {
      const current = nodeById.get(m.menuId);
      if (!current) continue;
      const parentId = m.topMenu;
      if (parentId && parentId !== '*' && nodeById.has(parentId)) {
        const parent = nodeById.get(parentId);
        parent?.children?.push(current);
      } else {
        roots.push(current);
      }
    }

    const sortTree = (arr: TreeNode[]): TreeNode[] =>
      arr
        .sort((a, b) => (seqById.get(a.menuId) ?? 0) - (seqById.get(b.menuId) ?? 0))
        .map((n) => ({
          ...n,
          children:
            n.children && n.children.length > 0
              ? sortTree(n.children)
              : undefined,
        }));

    return sortTree(roots);
  }

  const work = (arr: unknown[], prefix = 'n'): TreeNode[] =>
    arr
      .map((raw, idx) => {
        if (!raw || typeof raw !== 'object') return null;
        const any = raw as Record<string, unknown>;
        const menuId = toStringSafe(any.id) || `${prefix}-${idx}`;
        const menuNm = toStringSafe(any.label) || menuId;
        const path = any.path == null ? undefined : toStringSafe(any.path);
        const roles = Array.isArray(any.roles)
          ? (any.roles as unknown[]).map(toStringSafe).filter(Boolean)
          : undefined;
        const defaultExpanded = Boolean(any.defaultExpanded);
        const children = Array.isArray(any.children)
          ? work(any.children as unknown[], `${menuId}`)
          : undefined;
        return {
          menuId,
          menuNm,
          path,
          roles,
          defaultExpanded,
          children,
        } as TreeNode;
      })
      .filter((x): x is TreeNode => !!x);
  return work(nodes);
}

export function sanitizeNavPayload(raw: unknown): NavPayload {
  if (Array.isArray(raw)) {
    const menu = sanitizeMenu(raw);
    const tree = sanitizeTree(raw);
    return { menu, tree };
  }

  const any = (raw ?? {}) as Record<string, unknown>;
  const menu = sanitizeMenu(any.menu);
  const tree = sanitizeTree(any.tree);
  return { menu, tree };
}

// ✅ TreeNode[] → UINode[] 로 강제 정규화(렌더 안전)
export function toSafeTree(nodes: TreeNode[] | undefined): UINode[] {
  if (!Array.isArray(nodes)) return [];
  const norm = (arr: TreeNode[], pfx = 'n'): UINode[] =>
    arr.map((n, i) => ({
      menuId: toStringSafe(n.menuId) || `${pfx}-${i}`,
      menuNm: toStringSafe(n.menuNm) || `${pfx}-${i}`,
      path: n.path ? toStringSafe(n.path) : undefined,
      roles: Array.isArray(n.roles)
        ? n.roles.map((r) => toStringSafe(r)).filter(Boolean)
        : [],
      defaultExpanded: !!n.defaultExpanded,
      children: Array.isArray(n.children)
        ? norm(n.children, `${pfx}-${i}`)
        : [],
    }));
  return norm(nodes);
}
