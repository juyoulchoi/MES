import type { MenuItem, TreeNode } from '@/lib/types';

// 역할 허용 판단
export function hasAccess(
  allowRoles: string[] | undefined,
  userRoles: string[]
): boolean {
  if (!allowRoles || allowRoles.length === 0) return true; // 지정 없으면 모두 허용
  return allowRoles.some((r) => userRoles.includes(r));
}

// 메뉴 권한 필터링
export function filterMenuByRole(
  items: MenuItem[],
  roles: string[]
): MenuItem[] {
  return items.filter((m) => hasAccess(m.roles, roles));
}

// 트리 권한 필터링(자식 재귀 필터 + 폴더 노드 노출 규칙)
export function filterTreeByRole(
  nodes: TreeNode[],
  roles: string[]
): TreeNode[] {
  return nodes
    .map((n) => ({
      ...n,
      children: n.children ? filterTreeByRole(n.children, roles) : undefined,
    }))
    .filter((n) => {
      const selfAllowed = hasAccess(n.roles, roles);
      const visibleChildren = (n.children?.length ?? 0) > 0;
      // 폴더 노드는 자식이 보이면 통과, 아니면 자기 권한으로 판단
      return visibleChildren || selfAllowed;
    });
}
