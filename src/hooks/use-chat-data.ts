import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { type Chat, type Message, saveChat, saveMessage, getMessages as getLocalMessages, getChats as getLocalChats, deleteLocalMessage, deleteLocalChat } from '@/lib/storage';
import * as api from '@/lib/api';
import useNetwork from '@/hooks/use-network';
import useMessageQueue from '@/hooks/use-message-queue';
import { type ServerChat, type ServerMessage, toLocalChat, toLocalMessage } from '@/lib/chat-types';

export type UserData = { user_id: string; phone?: string; display_name: string; avatar: string };

export function useChatData() {
  const [user, setUser] = useState<UserData | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<{ chat: Chat; type: 'voice' | 'video' } | null>(null);
  const lastPollRef = useRef<string>(new Date().toISOString());
  const notifPermRef = useRef<NotificationPermission>('default');

  const network = useNetwork();
  const { enqueue, syncing, queueLength } = useMessageQueue(network.online);

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

  const handleAuth = useCallback((userData: UserData) => {
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

  return {
    user, setUser,
    chats,
    activeChatId, setActiveChatId,
    messages,
    initialized,
    newChatOpen, setNewChatOpen,
    activeCall, setActiveCall,
    network,
    syncing, queueLength,
    handleSelectChat,
    handleSend,
    handleBack,
    handleDeleteMessage,
    handleLeaveChat,
    handleAuth,
    handleLogout,
    handleChatCreated,
    handleStartCall,
    handleCallFromChat,
  };
}