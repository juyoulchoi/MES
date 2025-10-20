import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
export default function NotFoundPage() {
  const nav = useNavigate();
  return (
    <div className="p-6 space-y-3">
      <h2 className="text-lg font-semibold">페이지를 찾을 수 없습니다.</h2>
      <Button onClick={() => nav('/')}>홈으로 가기</Button>
    </div>
  );
}
