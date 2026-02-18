import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Chat } from '@/lib/storage';

interface CallRecord {
  id: string;
  name: string;
  avatar: string;
  type: 'incoming' | 'outgoing' | 'missed';
  callType: 'voice' | 'video';
  time: string;
  online: boolean;
}

const DEMO_CALLS: CallRecord[] = [
  { id: '1', name: 'Алексей', avatar: 'А', type: 'incoming', callType: 'voice', time: 'Сегодня, 14:23', online: true },
  { id: '2', name: 'Мария', avatar: 'М', type: 'missed', callType: 'video', time: 'Сегодня, 11:05', online: true },
  { id: '3', name: 'Дмитрий', avatar: 'Д', type: 'outgoing', callType: 'voice', time: 'Вчера, 18:40', online: false },
  { id: '4', name: 'Анна', avatar: 'А', type: 'incoming', callType: 'video', time: 'Вчера, 09:15', online: true },
  { id: '5', name: 'Алексей', avatar: 'А', type: 'outgoing', callType: 'voice', time: '15 фев., 20:30', online: false },
];

interface CallsScreenProps {
  chats: Chat[];
  onStartCall: (chat: Chat, type: 'voice' | 'video') => void;
}

export default function CallsScreen({ chats, onStartCall }: CallsScreenProps) {
  const [calls] = useState<CallRecord[]>(DEMO_CALLS);

  const callIcon = (type: 'incoming' | 'outgoing' | 'missed') => {
    if (type === 'missed') return { icon: 'PhoneMissed', color: 'text-red-500' };
    if (type === 'incoming') return { icon: 'PhoneIncoming', color: 'text-emerald-500' };
    return { icon: 'PhoneOutgoing', color: 'text-primary' };
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold">Звонки</h2>
        <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
          <Icon name="PhoneCall" size={18} className="text-primary" />
        </button>
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
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                      {chat.avatar}
                    </div>
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

        {calls.map(call => {
          const ci = callIcon(call.type);
          return (
            <div key={call.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                  {call.avatar}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${call.type === 'missed' ? 'text-red-500' : ''}`}>
                  {call.name}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon name={ci.icon} size={12} className={ci.color} />
                  <span>{call.time}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const chat = chats.find(c => c.name === call.name);
                    if (chat) onStartCall(chat, 'voice');
                  }}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                >
                  <Icon name="Phone" size={16} className="text-primary" />
                </button>
                <button
                  onClick={() => {
                    const chat = chats.find(c => c.name === call.name);
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
