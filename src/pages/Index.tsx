import { useState, useEffect, useCallback } from 'react';
import { type Chat, type Message, getChats, saveChat, getMessages, saveMessage } from '@/lib/storage';
import useNetwork from '@/hooks/use-network';
import useMessageQueue from '@/hooks/use-message-queue';
import NetworkStatus from '@/components/NetworkStatus';
import ChatList from '@/components/ChatList';
import ChatWindow from '@/components/ChatWindow';
import EmptyState from '@/components/EmptyState';
import Icon from '@/components/ui/icon';

const DEMO_CHATS: Chat[] = [
  { id: '1', name: 'Алексей', avatar: 'А', lastMessage: 'Привет! Как проект?', lastTimestamp: Date.now() - 120000, unread: 2, online: true },
  { id: '2', name: 'Мария', avatar: 'М', lastMessage: 'Документы отправила', lastTimestamp: Date.now() - 3600000, unread: 0, online: true },
  { id: '3', name: 'Команда', avatar: '🚀', lastMessage: 'Релиз завтра в 10:00', lastTimestamp: Date.now() - 7200000, unread: 5, online: false },
  { id: '4', name: 'Дмитрий', avatar: 'Д', lastMessage: 'Спасибо за помощь!', lastTimestamp: Date.now() - 86400000, unread: 0, online: false },
  { id: '5', name: 'Анна', avatar: 'А', lastMessage: 'Встреча перенесена на пятницу', lastTimestamp: Date.now() - 172800000, unread: 1, online: true },
];

const DEMO_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: 'm1', chatId: '1', text: 'Привет! Как дела с проектом?', sender: 'them', timestamp: Date.now() - 300000, status: 'delivered' },
    { id: 'm2', chatId: '1', text: 'Привет! Всё идёт по плану, заканчиваю фронтенд', sender: 'me', timestamp: Date.now() - 240000, status: 'delivered' },
    { id: 'm3', chatId: '1', text: 'Отлично! Когда можно будет посмотреть?', sender: 'them', timestamp: Date.now() - 180000, status: 'delivered' },
    { id: 'm4', chatId: '1', text: 'Привет! Как проект?', sender: 'them', timestamp: Date.now() - 120000, status: 'delivered' },
  ],
  '2': [
    { id: 'm5', chatId: '2', text: 'Мария, нужны документы по контракту', sender: 'me', timestamp: Date.now() - 7200000, status: 'delivered' },
    { id: 'm6', chatId: '2', text: 'Документы отправила', sender: 'them', timestamp: Date.now() - 3600000, status: 'delivered' },
  ],
  '3': [
    { id: 'm7', chatId: '3', text: 'Все готовы к релизу?', sender: 'them', timestamp: Date.now() - 14400000, status: 'delivered' },
    { id: 'm8', chatId: '3', text: 'Да, тесты прошли ✅', sender: 'me', timestamp: Date.now() - 10800000, status: 'delivered' },
    { id: 'm9', chatId: '3', text: 'Релиз завтра в 10:00', sender: 'them', timestamp: Date.now() - 7200000, status: 'delivered' },
  ],
};

const REPLY_POOL = [
  'Понял, спасибо! 👍',
  'Хорошо, сделаю',
  'Отличная идея!',
  'Давай обсудим завтра',
  'Принято ✅',
  'Ок, жду',
  'Согласен',
  'Сейчас посмотрю',
  'Интересно, расскажи подробнее',
  'Готово!',
];

const Index = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState(false);

  const network = useNetwork();
  const { enqueue, syncing, queueLength } = useMessageQueue(network.online);

  useEffect(() => {
    async function init() {
      let stored = await getChats();
      if (stored.length === 0) {
        for (const chat of DEMO_CHATS) {
          await saveChat(chat);
        }
        for (const [chatId, msgs] of Object.entries(DEMO_MESSAGES)) {
          for (const msg of msgs) {
            await saveMessage({ ...msg, chatId });
          }
        }
        stored = DEMO_CHATS;
      }
      setChats(stored);
      setInitialized(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (activeChatId) {
      getMessages(activeChatId).then(setMessages);
    }
  }, [activeChatId]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setChats(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!activeChatId) return;

    const msg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      chatId: activeChatId,
      text,
      sender: 'me',
      timestamp: Date.now(),
      status: network.online ? 'sending' : 'sending',
      encrypted: true,
    };

    await saveMessage(msg);
    setMessages(prev => [...prev, msg]);

    setChats(prev => prev.map(c =>
      c.id === activeChatId ? { ...c, lastMessage: text, lastTimestamp: msg.timestamp } : c
    ).sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0)));

    if (network.online) {
      setTimeout(async () => {
        const delivered = { ...msg, status: 'delivered' as const };
        await saveMessage(delivered);
        setMessages(prev => prev.map(m => m.id === msg.id ? delivered : m));
      }, 800 + Math.random() * 1200);

      const chatId = activeChatId;
      setTimeout(async () => {
        const reply: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          chatId,
          text: REPLY_POOL[Math.floor(Math.random() * REPLY_POOL.length)],
          sender: 'them',
          timestamp: Date.now(),
          status: 'delivered',
        };
        await saveMessage(reply);
        setMessages(prev => {
          if (prev.length > 0 && prev[0].chatId === chatId) {
            return [...prev, reply];
          }
          return prev;
        });
        setChats(prev => prev.map(c =>
          c.id === chatId ? { ...c, lastMessage: reply.text, lastTimestamp: reply.timestamp, unread: activeChatId === chatId ? 0 : c.unread + 1 } : c
        ).sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0)));
      }, 2000 + Math.random() * 3000);
    } else {
      await enqueue(msg);
    }
  }, [activeChatId, network.online, enqueue]);

  const handleBack = useCallback(() => {
    setActiveChatId(null);
  }, []);

  const activeChat = chats.find(c => c.id === activeChatId);

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

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon name="Shield" size={16} className="text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-tight">Шифр</span>
        </div>
        <NetworkStatus
          online={network.online}
          quality={network.quality}
          syncing={syncing}
          queueLength={queueLength}
        />
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className={`w-full lg:w-80 border-r border-border bg-card flex-shrink-0 ${
          activeChatId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'
        }`}>
          <ChatList chats={chats} activeChatId={activeChatId} onSelect={handleSelectChat} />
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
    </div>
  );
};

export default Index;
