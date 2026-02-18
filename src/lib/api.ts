const AUTH_URL = 'https://functions.poehali.dev/dcfb261d-6e0d-4154-ae10-3f12cedb4bb5';
const CHATS_URL = 'https://functions.poehali.dev/77f17e43-1b58-4050-836e-28b21cbcb6c1';
const MESSAGES_URL = 'https://functions.poehali.dev/095f98e5-52f9-43b3-a2c8-578cf045f6e9';

function getUserId(): string {
  return localStorage.getItem('cipher_user_id') || '';
}

async function api(base: string, path: string, options: { method?: string; body?: Record<string, unknown>; params?: Record<string, string> } = {}) {
  const { method = 'GET', body, params } = options;
  let url = `${base}${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += `?${qs}`;
  }

  const fetchOptions: RequestInit = { method };

  if (body) {
    fetchOptions.headers = { 'Content-Type': 'text/plain' };
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);
  return res.json();
}

export async function register(username: string, password: string, displayName: string) {
  return api(AUTH_URL, '/register', {
    method: 'POST',
    body: { username, password, display_name: displayName },
  });
}

export async function login(username: string, password: string) {
  return api(AUTH_URL, '/login', {
    method: 'POST',
    body: { username, password },
  });
}

export async function searchUsers(query: string) {
  return api(AUTH_URL, '/search', {
    method: 'POST',
    body: { query },
  });
}

export async function updateStatus(online: boolean) {
  return api(AUTH_URL, '/status', {
    method: 'POST',
    body: { user_id: getUserId(), online },
  });
}

export async function getChats() {
  return api(CHATS_URL, '/list', {
    method: 'GET',
    params: { user_id: getUserId() },
  });
}

export async function createChat(partnerId: string) {
  return api(CHATS_URL, '/create', {
    method: 'POST',
    body: { user_id: getUserId(), partner_id: partnerId },
  });
}

export async function markChatRead(chatId: string) {
  return api(CHATS_URL, '/read', {
    method: 'POST',
    body: { user_id: getUserId(), chat_id: chatId },
  });
}

export async function sendMessage(chatId: string, text: string, clientId: string) {
  return api(MESSAGES_URL, '/send', {
    method: 'POST',
    body: { user_id: getUserId(), chat_id: chatId, text, client_id: clientId },
  });
}

export async function getMessagesList(chatId: string, after?: string) {
  const params: Record<string, string> = { chat_id: chatId };
  if (after) params.after = after;
  return api(MESSAGES_URL, '/list', { params });
}

export async function pollMessages(after: string) {
  return api(MESSAGES_URL, '/poll', {
    params: { after, user_id: getUserId() },
  });
}

export async function syncMessages(messages: { chat_id: string; text: string; client_id: string }[]) {
  return api(MESSAGES_URL, '/sync', {
    method: 'POST',
    body: { user_id: getUserId(), messages },
  });
}

export default { register, login, searchUsers, updateStatus, getChats, createChat, markChatRead, sendMessage, getMessagesList, pollMessages, syncMessages };