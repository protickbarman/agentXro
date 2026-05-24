import axios from 'axios';

const http = axios.create({ baseURL: '/', withCredentials: true });

http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('xro_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let _isRefreshing = false;

http.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && !err.config._isRetry) {
      try {
        _isRefreshing = true;
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('Refresh failed');
        const data = await res.json();
        const newToken = data.data.accessToken;
        localStorage.setItem('xro_token', newToken);
        err.config.headers.Authorization = `Bearer ${newToken}`;
        err.config._isRetry = true;
        return http(err.config);
      } catch {
        localStorage.removeItem('xro_token');
        localStorage.removeItem('xro_user');
        window.location.reload();
      } finally {
        _isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

/* ─── Auth ──────────────────────────────── */
export async function login(email, password) {
  const { data } = await http.post('/api/auth/login', { email, password });
  localStorage.setItem('xro_token', data.data.accessToken);
  localStorage.setItem('xro_user', JSON.stringify(data.data.user));
  return data.data;
}

export async function register(email, password, username) {
  const { data } = await http.post('/api/auth/register', { email, password, username });
  return data.data;
}

export function logout() {
  localStorage.removeItem('xro_token');
  localStorage.removeItem('xro_user');
}

export async function refreshToken() {
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  const token = data.data.accessToken;
  localStorage.setItem('xro_token', token);
  return token;
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('xro_user')); } catch { return null; }
}

export function getToken() {
  return localStorage.getItem('xro_token');
}

/* ─── Conversations ─────────────────────── */
export async function getConversations(limit = 50) {
  const { data } = await http.get(`/api/conversations?limit=${limit}`);
  return data.data || [];
}

export async function deleteConversation(id) {
  await http.delete(`/api/conversations/${id}`);
}

/* ─── Messages ──────────────────────────── */
export async function getMessages(convId, limit = 100) {
  const { data } = await http.get(`/api/messages/${convId}/messages?limit=${limit}`);
  return data.data || [];
}

/* ─── AI Send ───────────────────────────── */
export async function sendMessage(message, conversationId = null) {
  const body = { message };
  if (conversationId) body.conversationId = conversationId;
  const { data } = await http.post('/api/chat', body);
  return data.data;
}

export async function getRecentConversations(limit = 20) {
  const { data } = await http.get(`/api/chat?limit=${limit}`);
  return data.data || [];
}
