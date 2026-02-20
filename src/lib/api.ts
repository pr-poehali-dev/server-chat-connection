const AUTH_URL = 'https://functions.poehali.dev/dcfb261d-6e0d-4154-ae10-3f12cedb4bb5';
const CHATS_URL = 'https://functions.poehali.dev/77f17e43-1b58-4050-836e-28b21cbcb6c1';
const MESSAGES_URL = 'https://functions.poehali.dev/095f98e5-52f9-43b3-a2c8-578cf045f6e9';
const STATUSES_URL = 'https://functions.poehali.dev/0f0ea2b7-d2ed-4a9b-883f-05d4e2f5b3dd';
const WEBRTC_URL = 'https://functions.poehali.dev/804eac05-4299-4054-b8d8-791c06ffcd8b';

function getUserId(): string {
  const id = localStorage.getItem('cipher_user_id');
  return id && id !== 'undefined' ? id : '';
}

async function doFetch(url: string, fetchOptions: RequestInit): Promise<Response> {
  const res = await fetch(url, fetchOptions);
  if (res.status === 402) {
    await new Promise(r => setTimeout(r, 2000));
    return fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(20000) });
  }
  return res;
}

async function api(base: string, action: string, options: { method?: string; body?: Record<string, unknown>; params?: Record<string, string>; silent?: boolean } = {}) {
  const { method = 'GET', body, params, silent = false } = options;
  const qs = new URLSearchParams({ action, ...(params || {}) }).toString();
  const url = `${base}?${qs}`;

  const fetchOptions: RequestInit = { method, signal: AbortSignal.timeout(20000) };

  if (body) {
    fetchOptions.headers = { 'Content-Type': 'application/json' };
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const res = await doFetch(url, fetchOptions);
    if (res.status === 402) {
      return { error: 'Сервер временно недоступен. Попробуй через минуту.' };
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok && !data.error) {
      data.error = `Ошибка сервера (${res.status})`;
    }
    return data;
  } catch (e) {
    if (!silent) console.error(`[API] ${action} error:`, e);
    return { error: 'Нет связи с сервером. Проверь интернет.' };
  }
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

export async function createGroup(name: string, memberIds: string[]) {
  return api(CHATS_URL, 'create_group', {
    method: 'POST',
    body: { user_id: getUserId(), name, member_ids: memberIds },
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
    silent: true,
  });
}

export async function syncMessages(messages: { chat_id: string; text: string; client_id: string }[]) {
  return api(MESSAGES_URL, 'sync', {
    method: 'POST',
    body: { user_id: getUserId(), messages },
  });
}

export async function updateProfile(displayName: string, avatar: string) {
  return api(AUTH_URL, 'update_profile', {
    method: 'POST',
    body: { user_id: getUserId(), display_name: displayName, avatar },
  });
}

export async function deleteMessage(msgId: string, forAll: boolean) {
  return api(MESSAGES_URL, 'delete_message', {
    method: 'POST',
    body: { user_id: getUserId(), msg_id: msgId, for_all: forAll },
  });
}

export async function leaveChat(chatId: string) {
  return api(MESSAGES_URL, 'leave_chat', {
    method: 'POST',
    body: { user_id: getUserId(), chat_id: chatId },
  });
}

export async function getStatuses() {
  const uid = getUserId();
  if (!uid) return { users: [] };
  return api(STATUSES_URL, 'list', { params: { user_id: uid } });
}

export async function publishStatus(content: string, type: string, imageData?: string) {
  return api(STATUSES_URL, 'publish', {
    method: 'POST',
    body: { user_id: getUserId(), content, type, image_data: imageData || '' },
  });
}

export async function removeStatus(statusId: string) {
  return api(STATUSES_URL, 'remove', {
    method: 'POST',
    body: { user_id: getUserId(), status_id: statusId },
  });
}

export async function initiateCall(calleeId: string, chatId: string, callType: string, sdpOffer: string) {
  return api(WEBRTC_URL, 'initiate', {
    method: 'POST',
    body: { user_id: getUserId(), callee_id: calleeId, chat_id: chatId, call_type: callType, sdp_offer: sdpOffer },
  });
}

export async function answerCall(callId: string, sdpAnswer: string) {
  return api(WEBRTC_URL, 'answer', {
    method: 'POST',
    body: { user_id: getUserId(), call_id: callId, sdp_answer: sdpAnswer },
  });
}

export async function sendIceCandidate(callId: string, candidate: string) {
  return api(WEBRTC_URL, 'ice', {
    method: 'POST',
    body: { user_id: getUserId(), call_id: callId, candidate },
    silent: true,
  });
}

export async function endCall(callId: string) {
  return api(WEBRTC_URL, 'end', {
    method: 'POST',
    body: { user_id: getUserId(), call_id: callId },
  });
}

export async function rejectCall(callId: string) {
  return api(WEBRTC_URL, 'reject', {
    method: 'POST',
    body: { user_id: getUserId(), call_id: callId },
  });
}

export async function pollCall() {
  const uid = getUserId();
  if (!uid) return { call: null };
  return api(WEBRTC_URL, 'poll', { params: { user_id: uid }, silent: true });
}

export { getUserId };

export default { register, login, searchUsers, updateStatus, getChats, createChat, markChatRead, sendMessage, getMessagesList, pollMessages, syncMessages, updateProfile, deleteMessage, leaveChat, getStatuses, publishStatus, removeStatus, initiateCall, answerCall, sendIceCandidate, endCall, rejectCall, pollCall };