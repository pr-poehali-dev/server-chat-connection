import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AvatarImg } from '@/lib/avatars';
import { getStatuses, publishStatus, removeStatus } from '@/lib/api';

interface StatusItem {
  id: string;
  type: 'text' | 'image';
  content: string;
  image_url?: string;
  created_at: string;
}

interface UserStatuses {
  user_id: string;
  display_name: string;
  avatar: string;
  is_mine: boolean;
  statuses: StatusItem[];
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
  return 'Вчера';
}

export default function StatusScreen({ displayName, avatar }: { displayName: string; avatar: string }) {
  const [users, setUsers] = useState<UserStatuses[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState<{ user: UserStatuses; idx: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageDataRef = useRef<string>('');

  const load = useCallback(async () => {
    const res = await getStatuses();
    if (res.users) setUsers(res.users);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      imageDataRef.current = (ev.target?.result as string) || '';
      if (!text.trim()) setText(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!text.trim() && !imageDataRef.current) return;
    setPublishing(true);
    const type = imageDataRef.current ? 'image' : 'text';
    await publishStatus(text.trim() || 'Фото', type, imageDataRef.current);
    imageDataRef.current = '';
    setText('');
    setComposing(false);
    setPublishing(false);
    await load();
  };

  const handleRemove = async (statusId: string) => {
    await removeStatus(statusId);
    setPreview(null);
    await load();
  };

  const mine = users.find(u => u.is_mine);
  const others = users.filter(u => !u.is_mine);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-base font-semibold">Статусы</h2>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">

        {/* Мой статус */}
        <div className="border-b border-border pb-2">
          <button
            onClick={() => setComposing(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
          >
            <div className="relative flex-shrink-0">
              <AvatarImg avatar={avatar} size={48} />
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-2 border-background">
                <Icon name="Plus" size={12} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Мой статус</div>
              <div className="text-xs text-muted-foreground">
                {mine?.statuses?.[0] ? timeAgo(mine.statuses[0].created_at) : 'Нажмите, чтобы добавить'}
              </div>
            </div>
            {mine?.statuses?.[0] && (
              <button
                onClick={e => { e.stopPropagation(); setPreview({ user: mine, idx: 0 }); }}
                className="ml-auto flex-shrink-0"
              >
                {mine.statuses[0].image_url
                  ? <img src={mine.statuses[0].image_url} className="w-10 h-10 rounded-lg object-cover" />
                  : <span className="text-xs text-muted-foreground max-w-[80px] truncate block text-right">{mine.statuses[0].content}</span>
                }
              </button>
            )}
          </button>

          {composing && (
            <div className="mx-4 mb-3 bg-card border border-border rounded-xl p-3 flex flex-col gap-2">
              <textarea
                className="w-full bg-transparent text-sm resize-none outline-none min-h-[60px] placeholder:text-muted-foreground"
                placeholder="Что у вас нового?"
                value={text}
                onChange={e => setText(e.target.value)}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted"
                >
                  <Icon name="Image" size={14} />
                  Фото
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <div className="flex-1" />
                <button onClick={() => { setComposing(false); setText(''); imageDataRef.current = ''; }} className="text-xs text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
                  Отмена
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing || (!text.trim() && !imageDataRef.current)}
                  className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg disabled:opacity-40"
                >
                  {publishing ? '...' : 'Опубликовать'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Статусы других */}
        {loading && (
          <div className="flex justify-center py-8">
            <Icon name="Loader2" size={20} className="text-muted-foreground animate-spin" />
          </div>
        )}

        {!loading && others.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center opacity-60">
            <Icon name="CircleDot" size={32} className="text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Статусы ваших контактов появятся здесь</p>
          </div>
        )}

        {others.map(u => (
          <button
            key={u.user_id}
            onClick={() => setPreview({ user: u, idx: 0 })}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full border-2 border-primary p-0.5 flex-shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden">
                <AvatarImg avatar={u.avatar} size={44} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{u.display_name}</div>
              <div className="text-xs text-muted-foreground">{timeAgo(u.statuses[0].created_at)}</div>
            </div>
            {u.statuses[0].image_url && (
              <img src={u.statuses[0].image_url} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            )}
          </button>
        ))}
      </ScrollArea>

      {/* Просмотр статуса */}
      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={() => setPreview(null)}>
          <div className="flex items-center gap-3 px-4 py-4 text-white" onClick={e => e.stopPropagation()}>
            <AvatarImg avatar={preview.user.avatar} size={36} />
            <div className="flex-1">
              <div className="text-sm font-medium">{preview.user.display_name}</div>
              <div className="text-xs opacity-70">{timeAgo(preview.user.statuses[preview.idx].created_at)}</div>
            </div>
            {preview.user.is_mine && (
              <button
                onClick={() => handleRemove(preview.user.statuses[preview.idx].id)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Icon name="Trash2" size={16} className="text-white/70" />
              </button>
            )}
            <button onClick={() => setPreview(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Icon name="X" size={18} className="text-white" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center px-6" onClick={e => e.stopPropagation()}>
            {preview.user.statuses[preview.idx].image_url
              ? <img src={preview.user.statuses[preview.idx].image_url} className="max-w-full max-h-full rounded-xl object-contain" />
              : <p className="text-white text-xl text-center leading-relaxed">{preview.user.statuses[preview.idx].content}</p>
            }
          </div>

          {preview.user.statuses.length > 1 && (
            <div className="flex justify-center gap-2 pb-8" onClick={e => e.stopPropagation()}>
              {preview.user.statuses.map((_, i) => (
                <button key={i} onClick={() => setPreview(p => p ? { ...p, idx: i } : null)}
                  className={`w-2 h-2 rounded-full transition-all ${i === preview.idx ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
