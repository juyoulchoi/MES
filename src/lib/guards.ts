import type { MenuItem, TreeNode, NavPayload, UINode, UserPayload } from './menuInfo';

const toStringSafe = (v: unknown): string => {
  try {
    if (typeof v === 'function' || typeof v === 'symbol') return '';
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

function toRoleList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (typeof entry === 'string') return toStringSafe(entry);
      if (!entry || typeof entry !== 'object') return '';
      const any = entry as Record<string, unknown>;
      return toStringSafe(any.role) || toStringSafe(any.roleCd) || toStringSafe(any.authCd);
    })
    .filter(Boolean);
}

function extractListCandidate(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'object') return [];

  const any = raw as Record<string, unknown>;
  return Array.isArray(any.data) ? (any.data as unknown[]) : [];
}

function normalizeProgramPath(pgmUrl: unknown, menuId: string): string {
  const raw = toStringSafe(pgmUrl).trim();
  if (!raw) return `/app/${menuId}.ts`;

  const normalized = raw.replace(/\\/g, '/');
  const fileName = normalized.split('/').filter(Boolean).pop() || `${menuId}.ts`;
  return `/app/${fileName.replace(/^~\//, '')}`;
}

export function sanitizeUserPayload(raw: unknown): UserPayload['user'] | null {
  if (!raw || typeof raw !== 'object') return null;

  const root = raw as Record<string, unknown>;
  const source = root.user && typeof root.user === 'object' ? (root.user as Record<string, unknown>) : root;

  const userid = toStringSafe(source.userid);
  const usrNm = toStringSafe(source.usrNm);
  if (!userid && !usrNm) return null;

  const usrGrpCd = toStringSafe(source.usrGrpCd);
  const deptCd = toStringSafe(source.deptCd);
  const phone = toStringSafe(source.phone);
  const email = toStringSafe(source.email);
  const roles = [
    ...toRoleList(source.roles),
    ...toRoleList(source.authorities),
    ...(usrGrpCd ? [usrGrpCd] : []),
  ].filter(Boolean);

  return {
    userid: userid || usrNm,
    usrNm: usrNm || userid,
    usrGrpCd,
    deptCd,
    phone,
    email,
    roles: Array.from(new Set(roles)),
  };
}

export function sanitizeMenu(items: unknown): MenuItem[] {
  const source = extractListCandidate(items);

  return source
    .map((raw, idx) => {
      if (!raw || typeof raw !== 'object') return null;
      const any = raw as Record<string, unknown>;

      const menuid = toStringSafe(any.menuId) || `menu-${idx}`;
      const menunm = toStringSafe(any.menuNm) || menuid;
      const pgmid = toStringSafe(any.pgmId) || menuid;
      const topMenu = toStringSafe(any.topMenu) || '*';
      const dspSeq = toNumberSafe(any.dspSeq, idx);
      const lvl = toNumberSafe(any.lvl, 0);
      const path = normalizeProgramPath(any.pgmUrl, menuid);

      return {
        menuid,
        menunm,
        path,
        pgmid,
        topMenu,
        dspSeq,
        lvl,
      } as MenuItem;
    })
    .filter((x): x is MenuItem => !!x);
}

export function sanitizeTree(nodes: unknown): TreeNode[] {
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
      defaultExpanded: m.lvl <= 1,
      children: [],
    });
  }

  for (const m of menu) {
    const current = nodeById.get(m.menuid);
    if (!current) continue;

    const parentId = m.topMenu;
    if (parentId && parentId !== '*' && parentId !== m.menuid && nodeById.has(parentId)) {
      nodeById.get(parentId)?.children?.push(current);
    } else {
      roots.push(current);
    }
  }

  const sortTree = (arr: TreeNode[]): TreeNode[] =>
    arr
      .sort((a, b) => (seqById.get(a.menuid) ?? 0) - (seqById.get(b.menuid) ?? 0))
      .map((node) => ({
        ...node,
        children: node.children && node.children.length > 0 ? sortTree(node.children) : undefined,
      }));

  return sortTree(roots);
}

export function sanitizeNavPayload(raw: unknown): NavPayload {
  const menu = sanitizeMenu(raw);
  const tree = sanitizeTree(raw);
  return { menu, tree };
}

export function toSafeTree(nodes: TreeNode[] | undefined): UINode[] {
  if (!Array.isArray(nodes)) return [];
  const norm = (arr: TreeNode[], pfx = 'n'): UINode[] =>
    arr.map((n, i) => ({
      menuid: toStringSafe(n.menuid) || `${pfx}-${i}`,
      menunm: toStringSafe(n.menunm) || `${pfx}-${i}`,
      path: n.path ? toStringSafe(n.path) : undefined,
      pgmid: toStringSafe(n.pgmid) || toStringSafe(n.menuid) || `${pfx}-${i}`,
      roles: [],
      defaultExpanded: !!n.defaultExpanded,
      children: Array.isArray(n.children) ? norm(n.children, `${pfx}-${i}`) : [],
    }));
  return norm(nodes);
}
