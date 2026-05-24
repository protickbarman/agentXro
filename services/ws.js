import { getToken, refreshToken } from './api.js';

function buildWsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = location.host;
  return `${proto}//${host}/ws-xro`;
}

class WsService {
  constructor() {
    this.socket = null;
    this.handlers = {};
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnect = 8;
    this.currentConvId = null;
    this._connecting = false;
    this.authenticated = false;
    this.refreshInterval = null;
  }

  on(type, handler) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(handler);
    return () => {
      this.handlers[type] = (this.handlers[type] || []).filter(h => h !== handler);
    };
  }

  _emit(type, data) {
    (this.handlers[type] || []).forEach(h => { try { h(data); } catch(e) { console.error('WS handler error', e); } });
    (this.handlers['*'] || []).forEach(h => { try { h({ type, ...data }); } catch {} });
  }

  send(data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  subscribe(convId) {
    this.currentConvId = convId;
    this.send({ type: 'subscribe_conversation', conversationId: convId });
  }

  unsubscribe(convId) {
    this.send({ type: 'unsubscribe_conversation', conversationId: convId });
    if (this.currentConvId === convId) this.currentConvId = null;
  }

  connect() {
    const token = getToken();
    if (!token) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) return;

    this._emit('status', { status: 'connecting' });

    try {
      this.socket = new WebSocket(buildWsUrl());
    } catch (e) {
      console.error('[WS] create error', e);
      this._emit('status', { status: 'error' });
      this._scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this._connecting = false;
      this.send({ type: 'auth', token: getToken() });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'auth_success') {
          this.authenticated = true;
          this._emit('status', { status: 'connected' });
          this._startRefreshInterval();
          if (this.currentConvId) this.subscribe(this.currentConvId);
          return;
        }

        if (data.type === 'auth_error') {
          this.authenticated = false;
          this._emit('status', { status: 'auth_error' });
          this._tryRefreshAndReconnect();
          return;
        }

        this._emit(data.type, data);
      } catch(e) {
        console.error('[WS] parse error', e);
      }
    };

    this.socket.onclose = (e) => {
      this.authenticated = false;
      this._stopRefreshInterval();
      this._emit('status', { status: 'disconnected' });
      if (e.code !== 1000 && this.reconnectAttempts < this.maxReconnect) {
        this._scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      this._emit('status', { status: 'error' });
    };
  }

  async _tryRefreshToken() {
    try {
      const newToken = await refreshToken();
      if (newToken) {
        this.send({ type: 'renew_token', token: newToken });
      }
    } catch {
      this._emit('status', { status: 'auth_error' });
    }
  }

  _startRefreshInterval() {
    this._stopRefreshInterval();
    this.refreshInterval = setInterval(() => this._tryRefreshToken(), 600000);
  }

  _stopRefreshInterval() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async _tryRefreshAndReconnect() {
    try {
      const newToken = await refreshToken();
      if (newToken) {
        this.disconnect();
        this.connect();
      }
    } catch {
      this.disconnect();
    }
  }

  _scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectAttempts++;
    console.log(`[WS] reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      if (getToken()) this.connect();
    }, delay);
  }

  disconnect() {
    this._stopRefreshInterval();
    clearTimeout(this.reconnectTimer);
    this.reconnectAttempts = this.maxReconnect;
    this.authenticated = false;
    this.socket?.close(1000, 'Logout');
    this.socket = null;
    this._emit('status', { status: 'disconnected' });
  }
}

export const ws = new WsService();

setInterval(() => { ws.send({ type: 'ping' }); }, 25000);
