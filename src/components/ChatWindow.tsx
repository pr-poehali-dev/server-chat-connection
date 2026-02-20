import { useState, useRef, useEffect, useCallback } from 'react';
import { type Message, type Chat } from '@/lib/storage';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import EmojiPicker from '@/components/EmojiPicker';
import GifPicker from '@/components/GifPicker';
import { AvatarImg } from '@/lib/avatars';

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  online: boolean;
  onSend: (text: string) => void;
  onBack: () => void;
  onCall?: (type: 'voice' | 'video') => void;
  onDeleteMessage?: (msgId: string, forAll: boolean) => void;
  onLeaveChat?: () => void;
}

interface MsgMenu {
  msgId: string;
  isMine: boolean;
  canDeleteForAll: boolean;
  x: number;
  y: number;
}

function MessageStatus({ status }: { status: Message['status'] }) {
  switch (status) {
    case 'sending': return <Icon name="Clock" size={12} className="text-primary-foreground/60 animate-pulse-dot" />;
    case 'sent': return <Icon name="Check" size={12} className="text-primary-foreground/60" />;
    case 'delivered': return <Icon name="CheckCheck" size={12} className="text-primary-foreground/80" />;
    case 'failed': return <Icon name="AlertCircle" size={12} className="text-red-400" />;
  }
}

function formatMsgTime(ts: number) {
  return new Date(ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWindow({ chat, messages, online, onSend, onBack, onCall, onDeleteMessage, onLeaveChat }: ChatWindowProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [msgMenu, setMsgMenu] = useState<MsgMenu | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    const close = () => { setMsgMenu(null); setShowChatMenu(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    setShowEmoji(false);
    setShowGif(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const openMsgMenu = useCallback((e: React.MouseEvent | React.TouchEvent, msg: Message) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const age = (Date.now() - msg.timestamp) / 3600000;
    setMsgMenu({
      msgId: msg.id,
      isMine: msg.sender === 'me',
      canDeleteForAll: msg.sender === 'me' && age < 24,
      x: rect.left,
      y: rect.bottom + 4,
    });
  }, []);

  const handleTouchStart = useCallback((msg: Message) => (e: React.TouchEvent) => {
    longPressRef.current = setTimeout(() => openMsgMenu(e, msg), 500);
  }, [openMsgMenu]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressRef.current);
  }, []);

  return (
    <div className="flex flex-col h-full" onClick={() => { setMsgMenu(null); setShowChatMenu(false); }}>
      {/* Шапка */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <button onClick={onBack} className="lg:hidden p-1 -ml-1 hover:bg-muted rounded-md transition-colors">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div className="relative flex-shrink-0">
          <AvatarImg avatar={chat.avatar} size={36} />
          {chat.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{chat.name}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Icon name="Shield" size={10} className="text-emerald-500" />
            Зашифрован
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onCall && (
            <>
              <button onClick={() => onCall('voice')} className="p-2 hover:bg-muted rounded-md transition-colors">
                <Icon name="Phone" size={16} className="text-muted-foreground" />
              </button>
              <button onClick={() => onCall('video')} className="p-2 hover:bg-muted rounded-md transition-colors">
                <Icon name="Video" size={16} className="text-muted-foreground" />
              </button>
            </>
          )}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowChatMenu(v => !v); }}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <Icon name="MoreVertical" size={16} className="text-muted-foreground" />
            </button>
            {showChatMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[160px] py-1 animate-fade-in" onClick={e => e.stopPropagation()}>
                {onLeaveChat && (
                  <button
                    onClick={() => { setShowChatMenu(false); onLeaveChat(); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Icon name="LogOut" size={14} />
                    Выйти из чата
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Сообщения */}
      <ScrollArea className="flex-1 scrollbar-thin" ref={scrollRef}>
        <div className="flex flex-col gap-1 p-4">
          <div className="self-center mb-4 px-3 py-1.5 bg-muted rounded-full text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Icon name="Lock" size={10} />
            Сквозное шифрование включено
          </div>

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex animate-fade-in ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                onContextMenu={e => openMsgMenu(e, msg)}
                onTouchStart={handleTouchStart(msg)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                className={`max-w-[75%] px-3 py-2 rounded-2xl cursor-pointer select-none ${
                  msg.sender === 'me'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                } ${msg.status === 'failed' ? 'opacity-60' : ''}`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${
                  msg.sender === 'me' ? 'text-primary-foreground/60' : 'text-muted-foreground'
                }`}>
                  <span className="text-[10px]">{formatMsgTime(msg.timestamp)}</span>
                  {msg.sender === 'me' && <MessageStatus status={msg.status} />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Контекстное меню сообщения */}
      {msgMenu && (
        <div
          className="fixed bg-card border border-border rounded-xl shadow-xl z-50 min-w-[180px] py-1 animate-fade-in"
          style={{ left: Math.min(msgMenu.x, window.innerWidth - 200), top: Math.min(msgMenu.y, window.innerHeight - 120) }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => { onDeleteMessage?.(msgMenu.msgId, false); setMsgMenu(null); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            <Icon name="Trash2" size={14} className="text-muted-foreground" />
            Удалить у себя
          </button>
          {msgMenu.canDeleteForAll && (
            <button
              onClick={() => { onDeleteMessage?.(msgMenu.msgId, true); setMsgMenu(null); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Icon name="Trash2" size={14} />
              Удалить у всех
            </button>
          )}
        </div>
      )}

      {!online && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <Icon name="WifiOff" size={14} />
          <span>Офлайн — сообщения будут отправлены при подключении</span>
        </div>
      )}

      {showEmoji && (
        <div className="px-4 pb-1">
          <EmojiPicker onSelect={e => { setText(p => p + e); inputRef.current?.focus(); }} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      {showGif && (
        <div className="px-4 pb-1">
          <GifPicker onSelect={g => { onSend(g); setShowGif(false); }} onClose={() => setShowGif(false)} />
        </div>
      )}

      <div className="px-4 py-3 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-end gap-1.5">
          <button
            onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
            className={`p-2 rounded-md transition-colors flex-shrink-0 mb-0.5 ${showEmoji ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
          >
            <Icon name="Smile" size={18} />
          </button>
          <button
            onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
            className={`p-2 rounded-md transition-colors flex-shrink-0 mb-0.5 ${showGif ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
          >
            <span className="text-xs font-bold">GIF</span>
          </button>
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { setShowEmoji(false); setShowGif(false); }}
              placeholder="Сообщение..."
              rows={1}
              className="w-full resize-none bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 ring-primary/30 transition-all placeholder:text-muted-foreground max-h-32 scrollbar-thin"
              style={{ minHeight: '40px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
          >
            <Icon name="Send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
