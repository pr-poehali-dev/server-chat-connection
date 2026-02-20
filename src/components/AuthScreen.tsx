import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { register, login } from '@/lib/api';

interface AuthScreenProps {
  onAuth: (user: { user_id: string; phone: string; display_name: string; avatar: string }) => void;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '+7 ';
  let d = digits;
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7')) d = '7' + d;
  
  let result = '+7';
  if (d.length > 1) result += ' (' + d.slice(1, 4);
  if (d.length > 4) result += ') ' + d.slice(4, 7);
  if (d.length > 7) result += '-' + d.slice(7, 9);
  if (d.length > 9) result += '-' + d.slice(9, 11);
  return result;
}

export default function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('+7 ');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const phoneDigits = phone.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length >= 11;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = mode === 'login'
        ? await login(phone, password)
        : await register(phone, password, displayName || phone);

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
          <div className="w-16 h-16 rounded-2xl overflow-hidden mb-4 shadow-md">
            <img src="https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/files/79b23ae2-2716-4535-95e2-0056b3f1b56f.jpg" alt="Того" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-bold">Того</h1>
          <p className="text-sm text-muted-foreground mt-1">Приватный мессенджер</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <Input
              placeholder="Ваше имя"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="h-11"
            />
          )}
          <Input
            type="tel"
            placeholder="+7 (999) 123-45-67"
            value={phone}
            onChange={handlePhoneChange}
            className="h-11"
            autoComplete="tel"
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

          <Button type="submit" className="w-full h-11" disabled={loading || !isPhoneValid || !password}>
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