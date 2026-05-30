import axios from 'axios';

const http = axios.create({ baseURL: '/', withCredentials: true });

http.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('xro_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let _isRefreshing = false;
let _refreshPromise = null;

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

/* ─── Token helpers ─────────────────────── */
export function getToken() {
  return localStorage.getItem('xro_token');
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('xro_user')); } catch { return null; }
}

export async function ensureFreshToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = payload.exp * 1000 - Date.now();
    if (expiresIn > 30000) return token;
  } catch {}
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Refresh failed')))
    .then(data => {
      const t = data.data.accessToken;
      localStorage.setItem('xro_token', t);
      return t;
    })
    .catch(() => {
      localStorage.removeItem('xro_token');
      localStorage.removeItem('xro_user');
      window.location.reload();
      return null;
    })
    .finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

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



/* ─── AI Send (SSE via /xro/v1) ──────────── */
async function _doSSE(token, message, convId, callbacks, extraBody = {}) {
  const res = await fetch('/xro/v1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: message }],
      conversationId: convId,
      tools: true,
      stream: true,
      ...extraBody,
    }),
  });

  if (res.status === 401) return 'UNAUTHORIZED';
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let convIdReceived = false;
  let isThinking = false;
  let contentBuf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const parts = buf.split('\n');
    buf = parts.pop() ?? '';

    for (const raw of parts) {
      const line = raw.trimEnd();
      if (!line || !line.startsWith('data: ')) continue;

      const data = line.slice(6);

      if (data === '[DONE]') {
        callbacks.onDone?.();
        return 'OK';
      }

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      if (!convIdReceived && parsed.conversationId) {
        convIdReceived = true;
        callbacks.onConversationCreated?.(parsed.conversationId, parsed.isNew);
        continue;
      }

      const choice = parsed.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta || {};

      let didWork = false;

      if (delta.reasoning || delta.reasoning_content) {
        callbacks.onReasoning?.(delta.reasoning || delta.reasoning_content);
        didWork = true;
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.name) {
            callbacks.onToolCall?.({
              name: tc.function.name,
              arguments: tc.function.arguments,
            });
          }
        }
        didWork = true;
      }

      if (delta.content != null) {
        contentBuf += delta.content;
        let didConsume = true;
        while (didConsume) {
          didConsume = false;
          if (!isThinking) {
            const idx = contentBuf.indexOf('<think>');
            if (idx !== -1) {
              if (idx > 0) callbacks.onContent?.(contentBuf.slice(0, idx));
              isThinking = true;
              contentBuf = contentBuf.slice(idx + 7);
              didConsume = true;
            } else {
              let safeLen = contentBuf.length;
              for (let i = 1; i < 7; i++) {
                if (contentBuf.endsWith('<think>'.slice(0, i))) {
                  safeLen = contentBuf.length - i;
                  break;
                }
              }
              if (safeLen > 0) {
                callbacks.onContent?.(contentBuf.slice(0, safeLen));
                contentBuf = contentBuf.slice(safeLen);
              }
            }
          } else {
            const idx = contentBuf.indexOf('</think>');
            if (idx !== -1) {
              if (idx > 0) callbacks.onReasoning?.(contentBuf.slice(0, idx));
              isThinking = false;
              contentBuf = contentBuf.slice(idx + 8);
              didConsume = true;
            } else {
              let safeLen = contentBuf.length;
              for (let i = 1; i < 8; i++) {
                if (contentBuf.endsWith('</think>'.slice(0, i))) {
                  safeLen = contentBuf.length - i;
                  break;
                }
              }
              if (safeLen > 0) {
                callbacks.onReasoning?.(contentBuf.slice(0, safeLen));
                contentBuf = contentBuf.slice(safeLen);
              }
            }
          }
        }
        didWork = true;
      }

      // processed chunk instantly
    }
  }

  if (contentBuf.length > 0) {
    if (isThinking) {
      callbacks.onReasoning?.(contentBuf);
    } else {
      callbacks.onContent?.(contentBuf);
    }
  }

  return 'OK';
}

export async function sendMessage(message, convId = null, callbacks = {}, extraBody = {}) {
  let token = await ensureFreshToken();
  if (!token) throw new Error('Not authenticated');

  let result = await _doSSE(token, message, convId, callbacks, extraBody);

  if (result === 'UNAUTHORIZED') {
    token = await ensureFreshToken();
    if (!token) throw new Error('Session expired — please log in again');
    result = await _doSSE(token, message, convId, callbacks, extraBody);
    if (result === 'UNAUTHORIZED') {
      window.location.reload();
      throw new Error('Session expired');
    }
  }
}

export async function getRecentConversations(limit = 20) {
  const token = getToken();
  const res = await fetch(`/api/chat?limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}
