import type { MenuItem, TreeNode, NavPayload, UINode } from './menuInfo';

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

const normalizeMenuPath = (topMenu: string, menuid: string): string => {
  if (!menuid) return '';
  const folder = topMenu && topMenu !== '*' ? topMenu : menuid;
  return `/${folder}/${menuid}.ts`;
};

export function sanitizeMenu(items: unknown): MenuItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((raw, idx) => {
      if (!raw || typeof raw !== 'object') return null;

      const any = raw as Record<string, unknown>;

      const menuId =
        toStringSafe(any.menuId) ||
        toStringSafe(any.menuid) ||
        toStringSafe(any.MENU_ID) ||
        toStringSafe(any.id) ||
        `menu-${idx}`;
      const menuNm =
        toStringSafe(any.menuNm) ||
        toStringSafe(any.menunm) ||
        toStringSafe(any.MENU_NM) ||
        toStringSafe(any.label) ||
        menuId;
      const pgmId =
        toStringSafe(any.pgmId) || toStringSafe(any.pgmid) || toStringSafe(any.PGM_ID) || menuId;
      const lvl = toNumberSafe(any.lvl ?? any.LVL, 0);
      const topMenu =
        toStringSafe(any.topMenu) || toStringSafe(any.topmenu) || toStringSafe(any.TOP_MENU) || '*';
      const dspSeq = toNumberSafe(any.dspSeq ?? any.DSP_SEQ, idx);
      const roles = Array.isArray(any.roles)
        ? (any.roles as unknown[]).map(toStringSafe).filter(Boolean)
        : undefined;

      return {
        menuid: menuId,
        menunm: menuNm,
        path: normalizeMenuPath(topMenu, menuId),
        pgmid: pgmId,
        lvl,
        topMenu,
        dspSeq,
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
    return 'menuId' in any || 'menuid' in any || 'MENU_ID' in any;
  });

  if (looksLikeMenuRows) {
    const menu = sanitizeMenu(nodes);
    if (menu.length === 0) return [];

    const seqById = new Map<string, number>();
    const nodeById = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    for (const m of menu) {
      seqById.set(m.menuid, m.dspSeq);
      nodeById.set(m.menuid, {
        menuid: m.menuid,
        menunm: m.menunm,
        path: m.path || undefined,
        pgmid: m.pgmid,
        roles: m.roles,
        defaultExpanded: m.lvl <= 1,
        children: [],
      });
    }

    for (const m of menu) {
      const current = nodeById.get(m.menuid);
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
        .sort((a, b) => (seqById.get(a.menuid) ?? 0) - (seqById.get(b.menuid) ?? 0))
        .map((n) => ({
          ...n,
          children: n.children && n.children.length > 0 ? sortTree(n.children) : undefined,
        }));

    return sortTree(roots);
  }

  const work = (arr: unknown[], prefix = 'n'): TreeNode[] =>
    arr
      .map((raw, idx) => {
        if (!raw || typeof raw !== 'object') return null;
        const any = raw as Record<string, unknown>;
        const menuid =
          toStringSafe(any.menuid) ||
          toStringSafe(any.menuId) ||
          toStringSafe(any.MENU_ID) ||
          toStringSafe(any.id) ||
          `${prefix}-${idx}`;
        const menunm =
          toStringSafe(any.menunm) ||
          toStringSafe(any.menuNm) ||
          toStringSafe(any.MENU_NM) ||
          toStringSafe(any.label) ||
          menuid;
        const path = any.path == null ? undefined : toStringSafe(any.path);
        const pgmid =
          toStringSafe(any.pgmid) || toStringSafe(any.pgmId) || toStringSafe(any.PGM_ID) || menuid;
        const roles = Array.isArray(any.roles)
          ? (any.roles as unknown[]).map(toStringSafe).filter(Boolean)
          : undefined;
        const defaultExpanded = Boolean(any.defaultExpanded);
        const children = Array.isArray(any.children)
          ? work(any.children as unknown[], `${menuid}`)
          : undefined;
        return {
          menuid,
          menunm,
          path,
          pgmid,
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
      menuid: toStringSafe(n.menuid) || `${pfx}-${i}`,
      menunm: toStringSafe(n.menunm) || `${pfx}-${i}`,
      path: n.path ? toStringSafe(n.path) : undefined,
      pgmid: toStringSafe(n.pgmid) || toStringSafe(n.menuid) || `${pfx}-${i}`,
      roles: Array.isArray(n.roles) ? n.roles.map((r) => toStringSafe(r)).filter(Boolean) : [],
      defaultExpanded: !!n.defaultExpanded,
      children: Array.isArray(n.children) ? norm(n.children, `${pfx}-${i}`) : [],
    }));
  return norm(nodes);
}
