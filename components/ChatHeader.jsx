import React from 'react';

export default function ChatHeader({ title, onMenuClick }) {
  return (
    <header className="chat-header">
      <button className="chat-header-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span className="chat-header-title">{title || 'Xro Agent'}</span>
      <div style={{ width: 32 }} />
    </header>
  );
}
