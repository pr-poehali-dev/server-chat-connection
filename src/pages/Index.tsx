import { useState, useEffect, useCallback, useRef } from 'react';
import { type Chat, type Message, saveChat, saveMessage, getMessages as getLocalMessages, getChats as getLocalChats } from '@/lib/storage';
import * as api from '@/lib/api';
import useNetwork from '@/hooks/use-network';
import useMessageQueue from '@/hooks/use-message-queue';
import NetworkStatus from '@/components/NetworkStatus';
import ChatList from '@/components/ChatList';
import ChatWindow from '@/components/ChatWindow';
import EmptyState from '@/components/EmptyState';
import AuthScreen from '@/components/AuthScreen';
import NewChatDialog from '@/components/NewChatDialog';
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

const Index = () => {
  const [user, setUser] = useState<{ user_id: string; username: string; display_name: string; avatar: string } | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const lastPollRef = useRef<string>(new Date().toISOString());

  const network = useNetwork();
  const { enqueue, syncing, queueLength } = useMessageQueue(network.online);

  useEffect(() => {
    const stored = localStorage.getItem('cipher_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch { /* noop */ }
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
          for (const c of localChats) {
            await saveChat(c);
          }
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
      if (network.online) {
        api.updateStatus(true);
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
          for (const m of localMsgs) {
            await saveMessage(m);
          }
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
    if (activeChatId) {
      loadMessages(activeChatId);
    }
  }, [activeChatId, loadMessages]);

  useEffect(() => {
    if (!user || !network.online) return;

    const interval = setInterval(async () => {
      try {
        const result = await api.pollMessages(lastPollRef.current);
        if (result.messages && result.messages.length > 0) {
          const newMsgs = result.messages.map((m: ServerMessage) => toLocalMessage(m, user.user_id));

          for (const m of newMsgs) {
            await saveMessage(m);
          }

          const lastTs = result.messages[result.messages.length - 1].created_at;
          lastPollRef.current = lastTs;

          if (activeChatId) {
            const chatMsgs = newMsgs.filter((m: Message) => m.chatId === activeChatId);
            if (chatMsgs.length > 0) {
              setMessages(prev => [...prev, ...chatMsgs]);
            }
          }

          loadChats();
        }
      } catch { /* noop */ }
    }, 3000);

    return () => clearInterval(interval);
  }, [user, network.online, activeChatId, loadChats]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
    if (network.online) {
      api.markChatRead(id);
    }
  }, [network.online]);

  const handleSend = useCallback(async (text: string) => {
    if (!activeChatId || !user) return;

    const clientId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const msg: Message = {
      id: clientId,
      chatId: activeChatId,
      text,
      sender: 'me',
      timestamp: Date.now(),
      status: 'sending',
      encrypted: true,
    };

    await saveMessage(msg);
    setMessages(prev => [...prev, msg]);

    setChats(prev => prev.map(c =>
      c.id === activeChatId ? { ...c, lastMessage: text, lastTimestamp: msg.timestamp } : c
    ).sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0)));

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

  const handleBack = useCallback(() => {
    setActiveChatId(null);
  }, []);

  const handleAuth = useCallback((userData: { user_id: string; username: string; display_name: string; avatar: string }) => {
    setUser(userData);
    lastPollRef.current = new Date().toISOString();
  }, []);

  const handleLogout = useCallback(() => {
    if (network.online) {
      api.updateStatus(false);
    }
    localStorage.removeItem('cipher_user_id');
    localStorage.removeItem('cipher_user');
    setUser(null);
    setChats([]);
    setMessages([]);
    setActiveChatId(null);
  }, [network.online]);

  const handleChatCreated = useCallback((chatId: string) => {
    loadChats().then(() => {
      setActiveChatId(chatId);
    });
  }, [loadChats]);

  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icon name="Shield" size={24} className="text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Shield" size={16} className="text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Шифр</span>
          <span className="text-xs text-muted-foreground ml-1">@{user.username}</span>
        </div>
        <div className="flex items-center gap-3">
          <NetworkStatus
            online={network.online}
            quality={network.quality}
            syncing={syncing}
            queueLength={queueLength}
          />
          <button onClick={handleLogout} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Выйти">
            <Icon name="LogOut" size={16} className="text-muted-foreground" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={`w-full lg:w-80 border-r border-border bg-card flex-shrink-0 ${
          activeChatId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'
        }`}>
          <ChatList chats={chats} activeChatId={activeChatId} onSelect={handleSelectChat} onNewChat={() => setNewChatOpen(true)} />
        </aside>

        <main className={`flex-1 min-w-0 ${
          !activeChatId ? 'hidden lg:flex' : 'flex'
        } flex-col`}>
          {activeChat ? (
            <ChatWindow
              chat={activeChat}
              messages={messages}
              online={network.online}
              onSend={handleSend}
              onBack={handleBack}
            />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

      <NewChatDialog
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
};

export default Index;
