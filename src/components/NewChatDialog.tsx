import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { searchUsers, createChat, createGroup } from '@/lib/api';
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
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searched, setSearched] = useState(false);

  // Группа
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<User[]>([]);

  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) { setUsers([]); setSearched(false); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchUsers(value);
        setUsers((result.users || []).filter((u: User) =>
          tab === 'group' ? !selected.find(s => s.id === u.id) : true
        ));
        setSearched(true);
      } catch { setUsers([]); }
      finally { setLoading(false); }
    }, 400);
  };

  const handleSelectDirect = async (user: User) => {
    setCreating(true);
    try {
      const result = await createChat(user.id);
      if (result.chat_id) { onChatCreated(result.chat_id); handleClose(); }
    } finally { setCreating(false); }
  };

  const toggleMember = (user: User) => {
    setSelected(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const result = await createGroup(groupName.trim(), selected.map(u => u.id));
      if (result.chat_id) { onChatCreated(result.chat_id); handleClose(); }
    } finally { setCreating(false); }
  };

  const handleClose = () => {
    onClose();
    setQuery(''); setUsers([]); setSearched(false);
    setGroupName(''); setSelected([]); setTab('direct');
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Новый чат</DialogTitle>
        </DialogHeader>

        {/* Вкладки */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            onClick={() => { setTab('direct'); setQuery(''); setUsers([]); setSearched(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'direct' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Icon name="MessageCircle" size={14} />
            Личный
          </button>
          <button
            onClick={() => { setTab('group'); setQuery(''); setUsers([]); setSearched(false); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'group' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Icon name="Users" size={14} />
            Группа
          </button>
        </div>

        <div className="space-y-3">
          {/* Название группы */}
          {tab === 'group' && (
            <Input
              placeholder="Название группы"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              autoFocus
            />
          )}

          {/* Выбранные участники */}
          {tab === 'group' && selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map(u => (
                <div key={u.id} className="flex items-center gap-1 bg-primary/10 text-primary rounded-full pl-1 pr-2 py-0.5">
                  <AvatarImg avatar={u.avatar || u.display_name[0]} size={20} />
                  <span className="text-xs font-medium">{u.display_name}</span>
                  <button onClick={() => toggleMember(u)} className="ml-0.5 hover:opacity-70">
                    <Icon name="X" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Поиск */}
          <div className="relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Имя или номер телефона"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              className="pl-9"
              autoFocus={tab === 'direct'}
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6">
              <Icon name="RefreshCw" size={18} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {users.map(user => {
                const isSelected = selected.find(u => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => tab === 'direct' ? handleSelectDirect(user) : toggleMember(user)}
                    disabled={creating}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left disabled:opacity-60"
                  >
                    <div className="relative flex-shrink-0">
                      <AvatarImg avatar={user.avatar || user.display_name[0]?.toUpperCase() || '?'} size={40} />
                      {user.online && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{user.display_name}</div>
                      <div className="text-xs text-muted-foreground">{user.phone}</div>
                    </div>
                    {tab === 'group' ? (
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {isSelected && <Icon name="Check" size={11} className="text-primary-foreground" />}
                      </div>
                    ) : (
                      <Icon name="MessageCircle" size={16} className="text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!loading && searched && users.length === 0 && (
            <div className="flex flex-col items-center py-4 gap-2 text-muted-foreground">
              <Icon name="UserX" size={28} />
              <p className="text-sm">Никого не найдено</p>
            </div>
          )}

          {!loading && !searched && (
            <p className="text-xs text-muted-foreground text-center py-1">
              Введите минимум 2 символа для поиска
            </p>
          )}

          {/* Кнопка создания группы */}
          {tab === 'group' && (
            <button
              onClick={handleCreateGroup}
              disabled={creating || !groupName.trim() || selected.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              {creating
                ? <Icon name="RefreshCw" size={16} className="animate-spin" />
                : <Icon name="Users" size={16} />
              }
              Создать группу {selected.length > 0 && `(${selected.length + 1})`}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
