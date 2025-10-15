export type MenuItem = {
  id: string;
  label: string; // 표시 텍스트(문자열로 강제 변환됨)
  path: string; // 절대 경로 "/app/..."
  roles?: string[]; // 허용 역할(없으면 모두 허용)
};

// ✅ 렌더 전용 강타입(정규화 후 사용)
export type UINode = {
  id: string;
  label: string;
  path?: string; // 존재할 수 있음 (폴더는 없음)
  children: UINode[]; // 항상 배열
  roles: string[]; // 항상 배열
  defaultExpanded: boolean; // 항상 boolean
};

export type TreeNode = {
  id: string;
  label: string; // 표시 텍스트(문자열로 강제 변환됨)
  path?: string; // 폴더 노드는 없음
  children?: TreeNode[];
  roles?: string[];
  defaultExpanded?: boolean;
};

export type NavPayload = {
  menu: MenuItem[];
  tree: TreeNode[];
};

export type UserPayload = {
  user: { name: string; roles: string[] };
};
