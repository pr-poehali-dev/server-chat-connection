import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { searchUsers, createChat } from '@/lib/api';

interface User {
  id: string;
  username: string;
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

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      const result = await searchUsers(value);
      setUsers(result.users || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
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
      }
    } catch {
      // noop
    } finally {
      setCreating('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Новый чат</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени..."
              value={query}
              onChange={e => handleSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-4">
              <Icon name="RefreshCw" size={16} className="animate-spin text-muted-foreground" />
            </div>
          )}

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                disabled={creating === user.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                    {user.avatar || user.display_name[0]?.toUpperCase()}
                  </div>
                  {user.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user.display_name}</div>
                  <div className="text-xs text-muted-foreground">@{user.username}</div>
                </div>
                {creating === user.id && (
                  <Icon name="RefreshCw" size={14} className="animate-spin text-muted-foreground" />
                )}
              </button>
            ))}
          </div>

          {query.length >= 2 && !loading && users.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Никого не найдено
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
