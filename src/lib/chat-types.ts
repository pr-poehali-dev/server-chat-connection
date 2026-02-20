import { type Chat, type Message } from '@/lib/storage';

export interface ServerChat {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  last_message: string;
  last_timestamp: string | null;
  unread: number;
  partner_id?: string;
}

export interface ServerMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  text: string;
  status: string;
  created_at: string;
}

export function toLocalChat(sc: ServerChat): Chat {
  return {
    id: sc.id,
    name: sc.name,
    avatar: sc.avatar || sc.name[0]?.toUpperCase() || '?',
    lastMessage: sc.last_message,
    lastTimestamp: sc.last_timestamp ? new Date(sc.last_timestamp).getTime() : undefined,
    unread: sc.unread || 0,
    online: sc.online,
    partnerId: sc.partner_id,
  };
}

export function toLocalMessage(sm: ServerMessage, userId: string): Message {
  return {
    id: sm.id,
    chatId: sm.chat_id,
    text: sm.text,
    sender: sm.sender_id === userId ? 'me' : 'them',
    timestamp: new Date(sm.created_at).getTime(),
    status: sm.status === 'delivered' ? 'delivered' : 'sent',
  };
}