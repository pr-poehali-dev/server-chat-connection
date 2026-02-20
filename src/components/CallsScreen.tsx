import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Chat } from '@/lib/storage';
import { AvatarImg } from '@/lib/avatars';

export interface CallHistoryRecord {
  id: string;
  chatId: string;
  name: string;
  avatar: string;
  type: 'incoming' | 'outgoing' | 'missed';
  callType: 'voice' | 'video';
  timestamp: number;
}

function formatCallTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const time = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (d.getTime() >= todayStart) return `Сегодня, ${time}`;
    return `Вчера, ${time}`;
  }
  if (diffDays === 1) return `Вчера, ${time}`;
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) + `, ${time}`;
}

interface CallsScreenProps {
  chats: Chat[];
  onStartCall: (chat: Chat, type: 'voice' | 'video') => void;
}

export default function CallsScreen({ chats, onStartCall }: CallsScreenProps) {
  const [calls, setCalls] = useState<CallHistoryRecord[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cipher_call_history');
      if (raw) setCalls(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cipher_call_history' && e.newValue) {
        try { setCalls(JSON.parse(e.newValue)); } catch { /* noop */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        const raw = localStorage.getItem('cipher_call_history');
        if (raw) setCalls(JSON.parse(raw));
      } catch { /* noop */ }
    };
    window.addEventListener('cipher_call_history_updated', handler);
    return () => window.removeEventListener('cipher_call_history_updated', handler);
  }, []);

  const callIcon = (type: 'incoming' | 'outgoing' | 'missed') => {
    if (type === 'missed') return { icon: 'PhoneMissed', color: 'text-red-500' };
    if (type === 'incoming') return { icon: 'PhoneIncoming', color: 'text-emerald-500' };
    return { icon: 'PhoneOutgoing', color: 'text-primary' };
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold">Звонки</h2>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        {chats.length > 0 && (
          <div className="px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Быстрый звонок</span>
            <div className="flex gap-3 mt-2 overflow-x-auto pb-2">
              {chats.slice(0, 6).map(chat => (
                <button
                  key={chat.id}
                  onClick={() => onStartCall(chat, 'voice')}
                  className="flex flex-col items-center gap-1 min-w-[56px]"
                >
                  <div className="relative">
                    <AvatarImg avatar={chat.avatar} size={44} />
                    {chat.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[56px]">{chat.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">История</span>
        </div>

        {calls.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon name="Phone" size={24} className="text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Нет звонков</p>
          </div>
        )}

        {calls.map(call => {
          const ci = callIcon(call.type);
          return (
            <div key={call.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors">
              <div className="relative flex-shrink-0">
                <AvatarImg avatar={call.avatar} size={40} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${call.type === 'missed' ? 'text-red-500' : ''}`}>
                  {call.name}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon name={ci.icon} size={12} className={ci.color} />
                  <span>{formatCallTime(call.timestamp)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const chat = chats.find(c => c.id === call.chatId);
                    if (chat) onStartCall(chat, 'voice');
                  }}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                >
                  <Icon name="Phone" size={16} className="text-primary" />
                </button>
                <button
                  onClick={() => {
                    const chat = chats.find(c => c.id === call.chatId);
                    if (chat) onStartCall(chat, 'video');
                  }}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                >
                  <Icon name="Video" size={16} className="text-primary" />
                </button>
              </div>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}
