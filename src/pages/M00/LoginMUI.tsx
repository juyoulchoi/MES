import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { login, resolveRedirect } from '@/lib/auth';

export default function LoginMuiPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname;

  const onLogin = async () => {
    if (!userId || !password || submitting) return;

    setSubmitting(true);
    setError(null);

    const res = await login({ userId, password });
    setSubmitting(false);

    if ('error' in res) {
      setError(res.error ?? '로그인 처리 중 오류가 발생했습니다.');
      return;
    }

    navigate(resolveRedirect(from), { replace: true });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'grey.50',
      }}
    >
      <Container maxWidth="sm">
        <Card elevation={2} sx={{ borderRadius: 3 }}>
          <CardHeader title="계정 로그인" />
          <CardContent>
            <Stack
              component="form"
              spacing={2}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void onLogin();
              }}
            >
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                label="아이디"
                name="userId"
                placeholder="아이디"
                autoComplete="username"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                inputProps={{ maxLength: 64 }}
                required
                fullWidth
              />

              <TextField
                label="비밀번호"
                name="password"
                type="password"
                placeholder="비밀번호"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputProps={{ maxLength: 128 }}
                required
                fullWidth
              />

              <Box sx={{ pt: 1, display: 'flex', justifyContent: 'center' }}>
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? '로그인 중...' : '로그인'}
                </Button>
              </Box>
            </Stack>
          </CardContent>
          <Box sx={{ pb: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              MES System
            </Typography>
          </Box>
        </Card>
      </Container>
    </Box>
  );
}
