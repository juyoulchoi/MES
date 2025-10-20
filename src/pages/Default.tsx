import type { NavPayload, UserPayload, MenuRow, AuthRow } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSmartNav } from '@/layouts/LayoutSPA';

// ====== 컴포넌트 ======
export default function DefaultPage() {
  const [menuRows, setMenuRows] = useState<MenuRow[] | null>(null);
  const [tree, setTree] = useState<Node[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const go = useSmartNav();
  const loc = useLocation();
  const navigate = useNavigate();
}
