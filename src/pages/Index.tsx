import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { IMAGE_AVATARS, AvatarImg } from '@/lib/avatars';
import { type Chat, type Message, saveChat, saveMessage, getMessages as getLocalMessages, getChats as getLocalChats, deleteLocalMessage, deleteLocalChat } from '@/lib/storage';
import * as api from '@/lib/api';
import useNetwork from '@/hooks/use-network';
import useMessageQueue from '@/hooks/use-message-queue';
import NetworkStatus from '@/components/NetworkStatus';
import OfflineScreen from '@/components/OfflineScreen';
import ChatList from '@/components/ChatList';
import ChatWindow from '@/components/ChatWindow';
import EmptyState from '@/components/EmptyState';
import AuthScreen from '@/components/AuthScreen';
import NewChatDialog from '@/components/NewChatDialog';
import BottomNav, { type TabId } from '@/components/BottomNav';
import StatusScreen from '@/components/StatusScreen';
import CallsScreen from '@/components/CallsScreen';
import CallOverlay from '@/components/CallOverlay';
import Icon from '@/components/ui/icon';

interface ServerChat {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  last_message: string;
  last_timestamp: string | null;
  unread: number;
}

interface ServerMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  status: string;
  created_at: string;
}

function toLocalChat(sc: ServerChat): Chat {
  return {
    id: sc.id,
    name: sc.name,
    avatar: sc.avatar || sc.name[0]?.toUpperCase() || '?',
    lastMessage: sc.last_message,
    lastTimestamp: sc.last_timestamp ? new Date(sc.last_timestamp).getTime() : undefined,
    unread: sc.unread || 0,
    online: sc.online,
  };
}

function toLocalMessage(sm: ServerMessage, userId: string): Message {
  return {
    id: sm.id,
    chatId: sm.chat_id,
    text: sm.text,
    sender: sm.sender_id === userId ? 'me' : 'them',
    timestamp: new Date(sm.created_at).getTime(),
    status: sm.status === 'delivered' ? 'delivered' : 'sent',
  };
}



function ProfileScreen({ user, onUpdate, onLogout }: {
  user: { user_id: string; phone?: string; display_name: string; avatar: string };
  onUpdate: (u: { user_id: string; phone?: string; display_name: string; avatar: string }) => void;
  onLogout: () => void;
}) {
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

const Index = () => {
  const [user, setUser] = useState<{ user_id: string; phone?: string; display_name: string; avatar: string } | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('chats');
  const [activeCall, setActiveCall] = useState<{ chat: Chat; type: 'voice' | 'video' } | null>(null);
  const lastPollRef = useRef<string>(new Date().toISOString());
  const notifPermRef = useRef<NotificationPermission>('default');

  const playNotifSound = useMemo(() => () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.3);
    } catch { /* noop */ }
  }, []);

  const network = useNetwork();
  const { enqueue, syncing, queueLength } = useMessageQueue(network.online);

  useEffect(() => {
    const storedId = localStorage.getItem('cipher_user_id');
    const stored = localStorage.getItem('cipher_user');
    if (stored && storedId && storedId !== 'undefined' && storedId !== 'null') {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.user_id) {
          setUser(parsed);
        } else {
          localStorage.removeItem('cipher_user_id');
          localStorage.removeItem('cipher_user');
        }
      } catch {
        localStorage.removeItem('cipher_user_id');
        localStorage.removeItem('cipher_user');
      }
    } else {
      localStorage.removeItem('cipher_user_id');
      localStorage.removeItem('cipher_user');
    }
    setInitialized(true);
  }, []);

  const loadChats = useCallback(async () => {
    if (!user) return;
    if (network.online) {
      try {
        const result = await api.getChats();
        if (result.chats) {
          const localChats = result.chats.map((c: ServerChat) => toLocalChat(c));
          setChats(localChats);
          for (const c of localChats) await saveChat(c);
        }
      } catch {
        const local = await getLocalChats();
        if (local.length > 0) setChats(local);
      }
    } else {
      const local = await getLocalChats();
      setChats(local);
    }
  }, [user, network.online]);

  useEffect(() => {
    if (user) {
      loadChats();
      if (network.online) api.updateStatus(true);
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(p => { notifPermRef.current = p; });
        } else {
          notifPermRef.current = Notification.permission;
        }
      }
    }
  }, [user, loadChats, network.online]);

  const loadMessages = useCallback(async (chatId: string) => {
    if (!user) return;
    if (network.online) {
      try {
        const result = await api.getMessagesList(chatId);
        if (result.messages) {
          const localMsgs = result.messages.map((m: ServerMessage) => toLocalMessage(m, user.user_id));
          setMessages(localMsgs);
          for (const m of localMsgs) await saveMessage(m);
          api.markChatRead(chatId);
        }
      } catch {
        const local = await getLocalMessages(chatId);
        setMessages(local);
      }
    } else {
      const local = await getLocalMessages(chatId);
      setMessages(local);
    }
  }, [user, network.online]);

  useEffect(() => {
    if (activeChatId) loadMessages(activeChatId);
  }, [activeChatId, loadMessages]);

  useEffect(() => {
    if (!user || !network.online) return;
    const interval = setInterval(async () => {
      try {
        const result = await api.pollMessages(lastPollRef.current);
        if (result.messages && result.messages.length > 0) {
          const newMsgs = result.messages.map((m: ServerMessage) => toLocalMessage(m, user.user_id));
          for (const m of newMsgs) await saveMessage(m);
          lastPollRef.current = result.messages[result.messages.length - 1].created_at;
          if (activeChatId) {
            const chatMsgs = newMsgs.filter((m: Message) => m.chatId === activeChatId);
            if (chatMsgs.length > 0) setMessages(prev => [...prev, ...chatMsgs]);
          }
          loadChats();

          const incomingMsgs = newMsgs.filter((m: Message) => m.sender === 'them');
          if (incomingMsgs.length > 0) playNotifSound();

          if ('Notification' in window && notifPermRef.current === 'granted') {
            const msgsToNotify = incomingMsgs.filter((m: Message) => m.chatId !== activeChatId || document.hidden);
            for (const m of msgsToNotify) {
              const chat = chats.find(c => c.id === m.chatId);
              const title = chat?.name || 'Новое сообщение';
              const notifOptions = {
                body: m.text,
                icon: 'https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/files/79b23ae2-2716-4535-95e2-0056b3f1b56f.jpg',
                tag: m.chatId,
                vibrate: [200, 100, 200],
              };
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(title, notifOptions);
                });
              } else {
                new Notification(title, notifOptions);
              }
            }
          }
        }
      } catch { /* noop */ }
    }, 1500);
    return () => clearInterval(interval);
  }, [user, network.online, activeChatId, loadChats, chats, playNotifSound]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    if (network.online) api.markChatRead(id);
  }, [network.online]);

  const handleSend = useCallback(async (text: string) => {
    if (!activeChatId || !user) return;
    const clientId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const msg: Message = { id: clientId, chatId: activeChatId, text, sender: 'me', timestamp: Date.now(), status: 'sending', encrypted: true };
    await saveMessage(msg);
    setMessages(prev => [...prev, msg]);
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, lastMessage: text, lastTimestamp: msg.timestamp } : c).sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0)));
    if (network.online) {
      try {
        const result = await api.sendMessage(activeChatId, text, clientId);
        if (result.id) {
          const delivered: Message = { ...msg, id: result.id, status: 'delivered' };
          await saveMessage(delivered);
          setMessages(prev => prev.map(m => m.id === clientId ? delivered : m));
          lastPollRef.current = result.created_at || new Date().toISOString();
        }
      } catch {
        const failed: Message = { ...msg, status: 'failed' };
        await saveMessage(failed);
        setMessages(prev => prev.map(m => m.id === clientId ? failed : m));
      }
    } else {
      await enqueue(msg);
    }
  }, [activeChatId, user, network.online, enqueue]);

  const handleBack = useCallback(() => setActiveChatId(null), []);

  const handleDeleteMessage = useCallback(async (msgId: string, forAll: boolean) => {
    await deleteLocalMessage(msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    if (network.online) api.deleteMessage(msgId, forAll);
  }, [network.online]);

  const handleLeaveChat = useCallback(async () => {
    if (!activeChatId) return;
    if (network.online) await api.leaveChat(activeChatId);
    await deleteLocalChat(activeChatId);
    setChats(prev => prev.filter(c => c.id !== activeChatId));
    setActiveChatId(null);
  }, [activeChatId, network.online]);

  const handleAuth = useCallback((userData: { user_id: string; phone?: string; display_name: string; avatar: string }) => {
    setUser(userData);
    lastPollRef.current = new Date().toISOString();
  }, []);

  const handleLogout = useCallback(() => {
    if (network.online) api.updateStatus(false);
    localStorage.removeItem('cipher_user_id');
    localStorage.removeItem('cipher_user');
    setUser(null);
    setChats([]);
    setMessages([]);
    setActiveChatId(null);
  }, [network.online]);

  const handleChatCreated = useCallback((chatId: string) => {
    loadChats().then(() => setActiveChatId(chatId));
  }, [loadChats]);

  const handleStartCall = useCallback((chat: Chat, type: 'voice' | 'video') => {
    setActiveCall({ chat, type });
  }, []);

  const handleCallFromChat = useCallback((type: 'voice' | 'video') => {
    const chat = chats.find(c => c.id === activeChatId);
    if (chat) setActiveCall({ chat, type });
  }, [chats, activeChatId]);

  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);

  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md">
            <img src="https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/files/79b23ae2-2716-4535-95e2-0056b3f1b56f.jpg" alt="Того" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onAuth={handleAuth} />;

  if (!network.online && chats.length === 0 && initialized) return <OfflineScreen />;

  const activeChat = chats.find(c => c.id === activeChatId);
  const inChat = !!activeChatId;

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="h-1.5 w-full overflow-hidden flex-shrink-0" aria-hidden>
        <svg width="100%" height="6" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="evk" x="0" y="0" width="48" height="6" patternUnits="userSpaceOnUse">
              {/* фон */}
              <rect width="48" height="6" fill="#1a3a5c"/>
              {/* красная полоса верх */}
              <rect y="0" width="48" height="1.2" fill="#c0392b"/>
              {/* красная полоса низ */}
              <rect y="4.8" width="48" height="1.2" fill="#c0392b"/>
              {/* бирюзовые ромбы */}
              <polygon points="8,3 11,1.5 14,3 11,4.5" fill="#2ab3b0"/>
              <polygon points="24,3 27,1.5 30,3 27,4.5" fill="#2ab3b0"/>
              <polygon points="40,3 43,1.5 46,3 43,4.5" fill="#2ab3b0"/>
              {/* золотые точки */}
              <circle cx="4" cy="3" r="0.8" fill="#d4a843"/>
              <circle cx="19" cy="3" r="0.8" fill="#d4a843"/>
              <circle cx="35" cy="3" r="0.8" fill="#d4a843"/>
            </pattern>
          </defs>
          <rect width="100%" height="6" fill="url(#evk)"/>
        </svg>
      </div>
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/bucket/afbe201b-93df-4672-998c-17567d16ef9b.jpg" alt="Того" className="w-full h-full object-cover" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Того</span>
          <span className="text-xs text-muted-foreground ml-1">{user.display_name}</span>
        </div>
        <div className="flex items-center gap-3">
          <NetworkStatus online={network.online} quality={network.quality} syncing={syncing} queueLength={queueLength} />
          <button onClick={handleLogout} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Выйти">
            <Icon name="LogOut" size={16} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chats' && (
          <>
            <aside className={`w-full lg:w-80 border-r border-border bg-card flex-shrink-0 ${inChat ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
              <ChatList chats={chats} activeChatId={activeChatId} onSelect={handleSelectChat} onNewChat={() => setNewChatOpen(true)} />
            </aside>
            <main className={`flex-1 min-w-0 ${!inChat ? 'hidden lg:flex' : 'flex'} flex-col`}>
              {activeChat ? (
                <ChatWindow chat={activeChat} messages={messages} online={network.online} onSend={handleSend} onBack={handleBack} onCall={handleCallFromChat} onDeleteMessage={handleDeleteMessage} onLeaveChat={handleLeaveChat} />
              ) : (
                <EmptyState />
              )}
            </main>
          </>
        )}

        {activeTab === 'status' && (
          <div className="flex-1">
            <StatusScreen displayName={user.display_name} avatar={user.avatar} />
          </div>
        )}

        {activeTab === 'calls' && (
          <div className="flex-1">
            <CallsScreen chats={chats} onStartCall={handleStartCall} />
          </div>
        )}

        {activeTab === 'profile' && (
          <ProfileScreen user={user} onUpdate={setUser} onLogout={handleLogout} />
        )}
      </div>

      {!(inChat && activeTab === 'chats') && (
        <BottomNav active={activeTab} onChange={(tab) => { if (tab !== 'chats') setActiveChatId(null); setActiveTab(tab); }} unreadChats={totalUnread} />
      )}

      {activeCall && (
        <CallOverlay chat={activeCall.chat} callType={activeCall.type} onEnd={() => setActiveCall(null)} />
      )}

      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} onChatCreated={handleChatCreated} />
    </div>
  );
};

export default Index;