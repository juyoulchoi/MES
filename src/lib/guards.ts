import type { MenuItem, TreeNode, NavPayload, UINode } from './types';

const toStringSafe = (v: unknown): string => {
  try {
    if (typeof v === 'function' || typeof v === 'symbol') return ''; // ⬅️ 추가
    return typeof v === 'string' ? v : v == null ? '' : String(v);
  } catch {
    return '';
  }
};

export function sanitizeMenu(items: unknown): MenuItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw, idx) => {
      if (!raw || typeof raw !== 'object') return null;
      const any = raw as Record<string, unknown>;
      const id = toStringSafe(any.id) || `menu-${idx}`;
      const label = toStringSafe(any.label) || id;
      const path = toStringSafe(any.path);
      const roles = Array.isArray(any.roles)
        ? (any.roles as unknown[]).map(toStringSafe).filter(Boolean)
        : undefined;
      if (!path.startsWith('/')) return null; // 절대 경로만 허용
      return { id, label, path, roles } as MenuItem;
    })
    .filter((x): x is MenuItem => !!x);
}

export function sanitizeTree(nodes: unknown): TreeNode[] {
  if (!Array.isArray(nodes)) return [];
  const work = (arr: unknown[], prefix = 'n'): TreeNode[] =>
    arr
      .map((raw, idx) => {
        if (!raw || typeof raw !== 'object') return null;
        const any = raw as Record<string, unknown>;
        const id = toStringSafe(any.id) || `${prefix}-${idx}`;
        const label = toStringSafe(any.label) || id;
        const path = any.path == null ? undefined : toStringSafe(any.path);
        const roles = Array.isArray(any.roles)
          ? (any.roles as unknown[]).map(toStringSafe).filter(Boolean)
          : undefined;
        const defaultExpanded = Boolean(any.defaultExpanded);
        const children = Array.isArray(any.children)
          ? work(any.children as unknown[], `${id}`)
          : undefined;
        return {
          id,
          label,
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
      id: toStringSafe(n.id) || `${pfx}-${i}`,
      label: toStringSafe(n.label) || `${pfx}-${i}`,
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
