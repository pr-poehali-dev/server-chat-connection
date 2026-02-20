import { useState } from 'react';
import { IMAGE_AVATARS, AvatarImg } from '@/lib/avatars';
import * as api from '@/lib/api';
import Icon from '@/components/ui/icon';

type UserData = { user_id: string; phone?: string; display_name: string; avatar: string };

interface ProfileScreenProps {
  user: UserData;
  onUpdate: (u: UserData) => void;
  onLogout: () => void;
}

export default function ProfileScreen({ user, onUpdate, onLogout }: ProfileScreenProps) {
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(user.display_name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    const result = await api.updateProfile(name.trim(), user.avatar);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    const updated = { ...user, display_name: result.display_name, avatar: result.avatar };
    localStorage.setItem('cipher_user', JSON.stringify(updated));
    onUpdate(updated);
    setEditName(false);
  };

  const handleSetAvatar = async (emoji: string) => {
    setSaving(true);
    const result = await api.updateProfile(user.display_name, emoji);
    setSaving(false);
    if (result.error) return;
    const updated = { ...user, avatar: result.avatar };
    localStorage.setItem('cipher_user', JSON.stringify(updated));
    onUpdate(updated);
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 gap-6 overflow-y-auto">
      <AvatarImg avatar={user.avatar} size={96} />

      <div className="w-full max-w-sm space-y-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Имя</div>
          {editName ? (
            <div className="flex gap-2 mt-1">
              <input
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                autoFocus
              />
              <button onClick={handleSaveName} disabled={saving} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                {saving ? '...' : 'Сохранить'}
              </button>
              <button onClick={() => { setEditName(false); setName(user.display_name); }} className="px-3 py-1.5 rounded-lg border border-border text-sm">
                Отмена
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mt-1">
              <span className="font-medium">{user.display_name}</span>
              <button onClick={() => setEditName(true)} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                <Icon name="Pencil" size={14} className="text-muted-foreground" />
              </button>
            </div>
          )}
          {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
        </div>

        {user.phone && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-1">Телефон</div>
            <div className="font-medium">{user.phone}</div>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-3">Аватар</div>
          <div className="grid grid-cols-5 gap-2">
            {IMAGE_AVATARS.map(avatar => (
              <button
                key={avatar.id}
                onClick={() => handleSetAvatar(avatar.id)}
                disabled={saving}
                className={`aspect-square rounded-xl overflow-hidden transition-all ${user.avatar === avatar.id ? 'ring-2 ring-primary ring-offset-2' : 'opacity-70 hover:opacity-100'}`}
                title={avatar.label}
              >
                <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Icon name="LogOut" size={16} />
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}
