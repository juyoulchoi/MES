import { Routes, Route, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
// 로그인 페이지는 캔버스의 Login 컴포넌트를 경로에 맞게 import
import Login from '@/pages/auth/Login'; // ← 파일 위치에 맞게 조정

function Home() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Home</h1>
      <Button asChild>
        <Link to="/login">로그인</Link>
      </Button>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
