import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore.js';

export default function ChatInput({ onSend }) {
  const [text, setText] = useState('');
  const ref = useRef(null);
  const { isTyping } = useChatStore();

  const send = () => {
    const msg = text.trim();
    if (!msg || isTyping) return;
    onSend(msg);
    setText('');
    if (ref.current) ref.current.style.height = 'auto';
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onInput = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  useEffect(() => {
    if (!isTyping) ref.current?.focus();
  }, [isTyping]);

  return (
    <div className="chat-input-area">
      <div className="chat-input-inner">
        <div className={`chat-input-box${isTyping ? ' disabled' : ''}`}>
          <textarea
            ref={ref}
            value={text}
            onChange={onInput}
            onKeyDown={onKey}
            disabled={isTyping}
            rows={1}
            placeholder="Message Xro Agent..."
            className="chat-textarea"
            style={{ minHeight: '24px' }}
          />
          <button
            className="chat-send-btn"
            onClick={send}
            disabled={!text.trim() || isTyping}
          >
            {isTyping ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
        <p className="chat-input-hint">
          Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
