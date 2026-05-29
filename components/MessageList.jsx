import React, { useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore.js';
import MessageBubble from './MessageBubble.jsx';

const SUGGESTIONS = [
  { icon: '🧠', text: 'Explain how neural networks work', prompt: 'Explain how neural networks work in simple terms' },
  { icon: '💻', text: 'Write a Python web scraper', prompt: 'Write a Python function to scrape headlines from a news website' },
  { icon: '🔍', text: 'Search latest AI breakthroughs', prompt: 'Search for the latest AI research breakthroughs in 2025' },
  { icon: '📊', text: 'Calculate compound interest', prompt: 'Calculate compound interest: $10,000 at 7% annual for 15 years' },
  { icon: '🌐', text: 'Translate to multiple languages', prompt: 'Translate "Hello, how are you?" into Spanish, French, Japanese and Arabic' },
  { icon: '🔐', text: 'Generate a secure password', prompt: 'Generate a cryptographically secure password and explain how it was made' },
];

function WelcomeScreen({ onPrompt }) {
  return (
    <div className="welcome-wrap">
      <div className="welcome-body">
        <div className="welcome-logo">X</div>
        <h1 className="welcome-title">What can I help with?</h1>
        <p className="welcome-sub">Ask anything — I'll pick the best tool automatically.</p>
        <div className="welcome-grid">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="welcome-card" onClick={() => onPrompt(s.prompt)}>
              <span className="welcome-card-icon">{s.icon}</span>
              <span className="welcome-card-text">{s.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MessageList({ onPrompt }) {
  const { activeConvId, messages, streamSegments, isTyping } = useChatStore();
  const bottomRef = useRef(null);

  const convKey = activeConvId || 'temp';
  const msgs = messages[convKey] || [];

  /* Index of the currently streaming agent message */
  const streamingMsgIdx = (() => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role !== 'user' && msgs[i].streaming === true) return i;
    }
    return -1;
  })();

  /* Auto-scroll to bottom on new content */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length, streamSegments.length]);

  if (msgs.length === 0) {
    return (
      <div className="messages-wrap">
        <WelcomeScreen onPrompt={onPrompt} />
      </div>
    );
  }

  return (
    <div className="messages-wrap">
      <div className="messages-scroll">
        <div className="messages-inner">
          {msgs.map((msg, i) => {
            const isMsgStreaming = i === streamingMsgIdx;
            return (
              <React.Fragment key={msg.id || i}>
                <MessageBubble
                  msg={msg}
                  isStreaming={isMsgStreaming}
                />
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
