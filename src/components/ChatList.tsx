import { type Chat } from '@/lib/storage';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { AvatarImg } from '@/lib/avatars';

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

function formatTime(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Вчера';
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

export default function ChatList({ chats, activeChatId, onSelect, onNewChat }: ChatListProps) {
  return (
    <div className="flex flex-col h-full relative">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div className="relative flex-1">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск..."
            className="w-full pl-9 pr-3 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-1 ring-primary/30 transition-all placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="py-1 pb-20">
          {chats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon name="MessageCircle" size={24} className="text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Нет чатов. Нажмите + чтобы начать общение</p>
            </div>
          )}
          {chats.map(chat => (
            <button
              key={chat.id}
              onClick={() => onSelect(chat.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 ${
                activeChatId === chat.id ? 'bg-muted' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <AvatarImg avatar={chat.avatar} size={40} />
                {chat.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{chat.name}</span>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                    {formatTime(chat.lastTimestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-muted-foreground truncate">
                    {chat.lastMessage || 'Нет сообщений'}
                  </span>
                  {chat.unread > 0 && (
                    <span className="flex-shrink-0 ml-2 bg-primary text-primary-foreground text-[10px] font-medium rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* FAB — кнопка нового чата */}
      <button
        onClick={onNewChat}
        className="absolute bottom-4 right-4 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center z-10"
        title="Новый чат"
      >
        <Icon name="Plus" size={24} />
      </button>
    </div>
  );
}