import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { register, login } from '@/lib/api';

interface AuthScreenProps {
  onAuth: (user: { user_id: string; username: string; display_name: string; avatar: string }) => void;
}

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = mode === 'login'
        ? await login(username, password)
        : await register(username, password, displayName || username);

      if (result.error) {
        setError(result.error);
      } else {
        localStorage.setItem('cipher_user_id', result.user_id);
        localStorage.setItem('cipher_user', JSON.stringify(result));
        onAuth(result);
      }
    } catch {
      setError('Ошибка соединения. Проверьте интернет.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Icon name="Shield" size={28} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold">Шифр</h1>
          <p className="text-sm text-muted-foreground mt-1">Приватный мессенджер</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <Input
              placeholder="Отображаемое имя"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="h-11"
            />
          )}
          <Input
            placeholder="Имя пользователя"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="h-11"
            autoComplete="username"
          />
          <Input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="h-11"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2 animate-fade-in">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full h-11" disabled={loading || !username || !password}>
            {loading ? (
              <Icon name="RefreshCw" size={16} className="animate-spin mr-2" />
            ) : null}
            {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </Button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-4 py-2"
        >
          {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </div>
  );
}
