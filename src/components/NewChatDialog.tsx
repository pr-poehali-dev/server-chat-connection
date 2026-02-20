import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { searchUsers, createChat } from '@/lib/api';
import { AvatarImg } from '@/lib/avatars';

interface User {
  id: string;
  phone: string;
  display_name: string;
  avatar: string;
  online: boolean;
}

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

export default function NewChatDialog({ open, onClose, onChatCreated }: NewChatDialogProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState('');
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = (value: string) => {
    setQuery(value);

    if (value.trim().length < 2) {
      setUsers([]);
      setSearched(false);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchUsers(value);
        setUsers(result.users || []);
        setSearched(true);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = async (user: User) => {
    setCreating(user.id);
    try {
      const result = await createChat(user.id);
      if (result.chat_id) {
        onChatCreated(result.chat_id);
        onClose();
        setQuery('');
        setUsers([]);
        setSearched(false);
      }
    } catch {
      // noop
    } finally {
      setCreating('');
    }
  };

  const handleClose = () => {
    onClose();
    setQuery('');
    setUsers([]);
    setSearched(false);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Новый чат</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Имя или номер телефона"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6">
              <Icon name="RefreshCw" size={18} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  disabled={!!creating}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left disabled:opacity-60"
                >
                  <div className="relative flex-shrink-0">
                    <AvatarImg avatar={user.avatar || user.display_name[0]?.toUpperCase() || '?'} size={40} />
                    {user.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{user.display_name}</div>
                    <div className="text-xs text-muted-foreground">{user.phone}</div>
                  </div>
                  {creating === user.id ? (
                    <Icon name="RefreshCw" size={14} className="animate-spin text-muted-foreground" />
                  ) : (
                    <Icon name="MessageCircle" size={16} className="text-muted-foreground" />
                  )}
                </button>
              ))}
            </div>
          )}

          {!loading && searched && users.length === 0 && (
            <div className="flex flex-col items-center py-6 gap-2 text-muted-foreground">
              <Icon name="UserX" size={32} />
              <p className="text-sm">Никого не найдено</p>
            </div>
          )}

          {!loading && !searched && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Введите минимум 2 символа для поиска
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
