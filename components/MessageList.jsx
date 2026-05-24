import React, { useRef, useEffect } from 'react';
import { useChatStore } from '../store/chatStore.js';
import MessageBubble from './MessageBubble.jsx';
import StepBar from './StepBar.jsx';

const SUGGESTIONS = [
  { icon: '🧠', text: 'Explain neural networks in simple terms', prompt: 'Explain how neural networks work in simple terms' },
  { icon: '💻', text: 'Write a Python function', prompt: 'Write a Python function to sort a list of dictionaries by a specific key' },
  { icon: '🔍', text: 'Search latest AI news', prompt: 'Search for the latest news about artificial intelligence in 2026' },
  { icon: '📊', text: 'Calculate compound interest', prompt: 'Calculate compound interest: $10,000 at 8% annual rate for 10 years' },
];

function WelcomeScreen({ onPrompt }) {
  return (
    <div className="chat-messages-scroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="welcome-screen">
        <div className="welcome-icon">X</div>
        <h1 className="welcome-title">What can I help with?</h1>
        <p className="welcome-sub">Ask anything — I'll route your question to the best AI agent automatically.</p>
        <div className="welcome-suggestions">
          {SUGGESTIONS.map((s, i) => (
            <button key={i} className="suggestion-btn" onClick={() => onPrompt(s.prompt)}>
              <span className="suggestion-icon">{s.icon}</span>
              <span className="suggestion-text">{s.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MessageList({ onPrompt }) {
  const { activeConvId, messages, streamingContent, steps } = useChatStore();
  const bottomRef = useRef(null);
  const msgs = activeConvId ? (messages[activeConvId] || []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length, streamingContent.length, steps.length]);

  if (!activeConvId || msgs.length === 0) {
    return (
      <div className="chat-messages-wrap">
        <WelcomeScreen onPrompt={onPrompt} />
      </div>
    );
  }

  const lastMsg = msgs[msgs.length - 1];
  const isLastAgent = lastMsg && lastMsg.role !== 'user';
  const lastUserIndex = [...msgs].reverse().findIndex(m => m.role === 'user');
  const absoluteLastUserIndex = lastUserIndex >= 0 ? msgs.length - 1 - lastUserIndex : -1;

  return (
    <div className="chat-messages-wrap">
      <div className="chat-messages-scroll">
        <div className="chat-messages-inner">
          {msgs.map((msg, i) => (
            <React.Fragment key={msg.id || i}>
              <MessageBubble
                msg={msg}
                streamingContent={i === msgs.length - 1 && isLastAgent ? streamingContent : ''}
              />
              {i === absoluteLastUserIndex && steps.length > 0 && <StepBar />}
            </React.Fragment>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
