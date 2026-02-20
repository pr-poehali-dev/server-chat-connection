const AUTH_URL = 'https://functions.poehali.dev/dcfb261d-6e0d-4154-ae10-3f12cedb4bb5';
const CHATS_URL = 'https://functions.poehali.dev/77f17e43-1b58-4050-836e-28b21cbcb6c1';
const MESSAGES_URL = 'https://functions.poehali.dev/095f98e5-52f9-43b3-a2c8-578cf045f6e9';

function getUserId(): string {
  const id = localStorage.getItem('cipher_user_id');
  return id && id !== 'undefined' ? id : '';
}

async function api(base: string, action: string, options: { method?: string; body?: Record<string, unknown>; params?: Record<string, string> } = {}) {
  const { method = 'GET', body, params } = options;
  const qs = new URLSearchParams({ action, ...(params || {}) }).toString();
  const url = `${base}?${qs}`;

  const fetchOptions: RequestInit = { method };

  if (body) {
    fetchOptions.headers = { 'Content-Type': 'application/json' };
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !data.error) {
    data.error = `Ошибка сервера (${res.status})`;
  }
  return data;
}

export async function register(phone: string, password: string, displayName: string) {
  return api(AUTH_URL, 'register', {
    method: 'POST',
    body: { phone, password, display_name: displayName },
  });
}

export async function login(phone: string, password: string) {
  return api(AUTH_URL, 'login', {
    method: 'POST',
    body: { phone, password },
  });
}

export async function searchUsers(query: string) {
  return api(AUTH_URL, 'search', {
    method: 'POST',
    body: { query, user_id: getUserId() },
  });
}

export async function updateStatus(online: boolean) {
  const uid = getUserId();
  if (!uid) return { ok: false };
  return api(AUTH_URL, 'status', {
    method: 'POST',
    body: { user_id: uid, online },
  });
}

export async function getChats() {
  const uid = getUserId();
  if (!uid) return { chats: [] };
  return api(CHATS_URL, 'list', {
    params: { user_id: uid },
  });
}

export async function createChat(partnerId: string) {
  return api(CHATS_URL, 'create', {
    method: 'POST',
    body: { user_id: getUserId(), partner_id: partnerId },
  });
}

export async function markChatRead(chatId: string) {
  return api(CHATS_URL, 'read', {
    method: 'POST',
    body: { user_id: getUserId(), chat_id: chatId },
  });
}

export async function sendMessage(chatId: string, text: string, clientId: string) {
  return api(MESSAGES_URL, 'send', {
    method: 'POST',
    body: { user_id: getUserId(), chat_id: chatId, text, client_id: clientId },
  });
}

export async function getMessagesList(chatId: string, after?: string) {
  const params: Record<string, string> = { chat_id: chatId };
  if (after) params.after = after;
  return api(MESSAGES_URL, 'list', { params });
}

export async function pollMessages(after: string) {
  const uid = getUserId();
  if (!uid) return { messages: [] };
  return api(MESSAGES_URL, 'poll', {
    params: { after, user_id: uid },
  });
}

export async function syncMessages(messages: { chat_id: string; text: string; client_id: string }[]) {
  return api(MESSAGES_URL, 'sync', {
    method: 'POST',
    body: { user_id: getUserId(), messages },
  });
}

export default { register, login, searchUsers, updateStatus, getChats, createChat, markChatRead, sendMessage, getMessagesList, pollMessages, syncMessages };
