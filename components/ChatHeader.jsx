import React from 'react';
import { useChatStore } from '../store/chatStore.js';

const STATUS = {
  connected:    { cls: 'connected',    label: 'Connected' },
  connecting:   { cls: 'connecting',   label: 'Connecting' },
  disconnected: { cls: 'disconnected', label: 'Offline' },
  error:        { cls: 'error',        label: 'Error' },
};

export default function ChatHeader({ title, onMenuClick }) {
  const wsStatus = useChatStore((s) => s.wsStatus);
  const s = STATUS[wsStatus] || STATUS.disconnected;

  return (
    <header className="chat-header">
      <button className="chat-header-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span className="chat-header-title">{title || 'Xro Agent'}</span>
      <div className="chat-header-status">
        <span className={`status-dot ${s.cls}`} />
        <span className="status-label">{s.label}</span>
      </div>
    </header>
  );
}
