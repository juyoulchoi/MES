export type MenuItem = {
  menuId: string;
  menuNm: string;
  path: string;
  pgmId: string;
  topMenu: string;
  dspSeq: number;
  lvl: number;
  roles?: string[]; // 허용 역할(없으면 모두 허용)
};

// ✅ 렌더 전용 강타입(정규화 후 사용)
export type UINode = {
  menuId: string;
  menuNm: string;
  path?: string; // 존재할 수 있음 (폴더는 없음)
  children: UINode[]; // 항상 배열
  roles: string[]; // 항상 배열
  defaultExpanded: boolean; // 항상 boolean
};

export type TreeNode = {
  menuId: string;
  menuNm: string; // 표시 텍스트(문자열로 강제 변환됨)
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
  user: {
    userId: string;
    usrNm: string;
    usrGrpCd: string;
    deptCd: string;
    phone: string;
    email: string;
    roles: string[]; // 권한 목록
  };
};

export type MenuRow = {
  MENU_ID: string;
  TOP_MENU: string; // 부모 MENU_ID, 루트는 "*"
  MENU_GB: string; // "WEB" 등
  MENU_NM: string; // 표시명
  PGM_ID?: string | null;
  PGM_URL?: string | null;
  LVL?: string | number | null; // "1" 루트 등
};

export type AuthRow = {
  MENU_ID: string;
  SER_AUTH: 'Y' | 'N';
};
